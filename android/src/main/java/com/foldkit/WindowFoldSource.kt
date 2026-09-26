package com.foldkit

import android.app.Activity
import android.content.ComponentCallbacks
import android.content.res.Configuration
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewTreeObserver
import androidx.core.util.Consumer
import androidx.window.java.layout.WindowInfoTrackerCallbackAdapter
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import androidx.window.layout.WindowLayoutInfo
import androidx.window.layout.WindowMetricsCalculator
import com.foldkit.core.FoldFeatureInput
import com.foldkit.core.PxRect
import java.util.WeakHashMap
import java.util.concurrent.Executor

/**
 * Fold-related inputs of one activity window, shared by the FoldKit module and
 * every FoldAwareView of that activity (see [acquire]):
 * - FoldingFeature from Jetpack WindowManager,
 * - display cutouts (the Android counterpart of iOS occlusion regions),
 * - window size and density (from one WindowMetrics query, so they always
 *   describe the same display),
 * - the hinge angle sensor, registered only while some client asked for it.
 *
 * Inputs are cached and refreshed on events; clients read [state] and are
 * notified only when it changes. Main thread only.
 */
class WindowFoldSource private constructor(private val activity: Activity) {
  data class Metrics(val widthPx: Int, val heightPx: Int, val density: Float)

  data class State(
    val folds: List<FoldFeatureInput>,
    val cutouts: List<PxRect>,
    val metrics: Metrics,
    /** Degrees, `null` without a hinge sensor. */
    val hingeAngle: Double?,
  )

  fun interface Listener {
    fun onFoldSourceChanged()
  }

  var state: State = State(emptyList(), emptyList(), Metrics(0, 0, 1f), lastHingeAngle)
    private set

  /** Incremented on every state change; lets clients skip recomputation cheaply. */
  var version: Int = 0
    private set

  private val listeners = LinkedHashSet<Listener>()
  private val hingeClients = HashSet<Listener>()
  private var folds: List<FoldFeatureInput> = emptyList()
  private var hingeAngle: Double? = lastHingeAngle
  private var hingeRegistered = false

  private val decorView: View
    get() = activity.window.decorView

  private val mainHandler = Handler(Looper.getMainLooper())
  private val mainExecutor = Executor { command -> mainHandler.post(command) }
  private val tracker = WindowInfoTrackerCallbackAdapter(WindowInfoTracker.getOrCreate(activity))
  private val sensorManager = activity.getSystemService(SensorManager::class.java)

  private val layoutInfoListener = Consumer<WindowLayoutInfo> { info ->
    folds = info.displayFeatures.filterIsInstance<FoldingFeature>().map { feature ->
      val bounds = feature.bounds
      FoldFeatureInput(
        bounds = PxRect(bounds.left, bounds.top, bounds.right, bounds.bottom),
        isHalfOpened = feature.state == FoldingFeature.State.HALF_OPENED,
        isSeparating = feature.isSeparating,
      )
    }
    refresh()
  }

  // Any layout pass in the window: covers resizes and insets-only changes
  // (cutouts), which don't change the decor view's bounds. refresh() only
  // notifies when something actually changed.
  private val globalLayoutListener = ViewTreeObserver.OnGlobalLayoutListener { refresh() }

  // Folding can change density without a layout pass.
  private val configurationCallbacks = object : ComponentCallbacks {
    override fun onConfigurationChanged(newConfig: Configuration) = refresh()

    @Deprecated("Deprecated in Java")
    override fun onLowMemory() = Unit
  }

  private val hingeListener = object : SensorEventListener {
    override fun onSensorChanged(event: SensorEvent) {
      hingeAngle = event.values.firstOrNull()?.toDouble()
      lastHingeAngle = hingeAngle
      refresh()
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
  }

  /** Stops notifying `listener`; the source stops entirely with its last client. */
  fun release(listener: Listener) {
    listeners.remove(listener)
    hingeClients.remove(listener)
    updateHingeRegistration()
    if (listeners.isEmpty()) {
      stop()
      sources.remove(activity)
    }
  }

  private fun add(listener: Listener, wantsHingeAngle: Boolean) {
    val first = listeners.isEmpty()
    listeners.add(listener)
    if (wantsHingeAngle) hingeClients.add(listener)
    if (first) start()
    updateHingeRegistration()
  }

  private fun start() {
    tracker.addWindowLayoutInfoListener(activity, mainExecutor, layoutInfoListener)
    decorView.viewTreeObserver.addOnGlobalLayoutListener(globalLayoutListener)
    activity.registerComponentCallbacks(configurationCallbacks)
    refresh()
  }

  private fun stop() {
    tracker.removeWindowLayoutInfoListener(layoutInfoListener)
    decorView.viewTreeObserver.removeOnGlobalLayoutListener(globalLayoutListener)
    activity.unregisterComponentCallbacks(configurationCallbacks)
  }

  /**
   * The sensor runs only while a client needs the angle (the module, while
   * the app is in the foreground). The last angle is kept when it stops, so a
   * paused-and-resumed app doesn't flicker to `unknown`; on-change sensors
   * report the current value right after registration anyway.
   */
  private fun updateHingeRegistration() {
    val needed = hingeClients.isNotEmpty()
    if (needed == hingeRegistered) return
    val sensor = hingeSensor() ?: return
    if (needed) {
      sensorManager?.registerListener(hingeListener, sensor, SensorManager.SENSOR_DELAY_UI)
    } else {
      sensorManager?.unregisterListener(hingeListener)
    }
    hingeRegistered = needed
  }

  private fun refresh() {
    val next = State(folds, readCutouts(), readMetrics(), hingeAngle)
    if (next == state) return
    state = next
    version += 1
    // Copy: a listener may release itself while being notified.
    listeners.toList().forEach { it.onFoldSourceChanged() }
  }

  private fun readMetrics(): Metrics {
    val metrics = WindowMetricsCalculator.getOrCreate().computeCurrentWindowMetrics(activity)
    return Metrics(metrics.bounds.width(), metrics.bounds.height(), metrics.density)
  }

  private fun readCutouts(): List<PxRect> {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) return emptyList()
    val cutout = decorView.rootWindowInsets?.displayCutout ?: return emptyList()
    return cutout.boundingRects.map { PxRect(it.left, it.top, it.right, it.bottom) }
  }

  private fun hingeSensor(): Sensor? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      sensorManager?.getDefaultSensor(Sensor.TYPE_HINGE_ANGLE)
    } else {
      null
    }

  companion object {
    private val sources = WeakHashMap<Activity, WindowFoldSource>()

    /** Process-wide last hinge reading, the initial value for new sources. */
    private var lastHingeAngle: Double? = null

    /**
     * Returns the shared source for `activity` and subscribes `listener`.
     * Every call must be balanced with [release].
     */
    fun acquire(activity: Activity, listener: Listener, wantsHingeAngle: Boolean): WindowFoldSource {
      val source = sources.getOrPut(activity) { WindowFoldSource(activity) }
      source.add(listener, wantsHingeAngle)
      return source
    }
  }
}
