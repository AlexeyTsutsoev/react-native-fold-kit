package com.foldkit

import android.app.Activity
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import com.foldkit.core.FoldMapper
import com.foldkit.core.FoldStateSnapshot
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Window-level fold state. Android counterpart of ios/FoldKit.mm +
 * ios/Core/FoldStateObserver.swift.
 *
 * `getFoldState` is synchronous on the JS thread, so it only returns a cached
 * snapshot; the shared [WindowFoldSource] is used on the main thread, and only
 * while the app is in the foreground (no hinge sensor or events in the
 * background).
 */
@ReactModule(name = FoldKitModule.NAME)
class FoldKitModule(reactContext: ReactApplicationContext) :
  NativeFoldKitSpec(reactContext),
  LifecycleEventListener,
  WindowFoldSource.Listener {

  @Volatile
  private var snapshot: FoldStateSnapshot = FoldStateSnapshot.UNSUPPORTED
  private val started = AtomicBoolean(false)

  // Main thread only.
  private var source: WindowFoldSource? = null
  private var sourceActivity: Activity? = null

  override fun getName() = NAME

  override fun getFoldState(): WritableMap {
    // Start lazily: by the time JS calls a method the event emitter callback
    // is installed, so the first update is never dropped.
    if (started.compareAndSet(false, true)) {
      reactApplicationContext.addLifecycleEventListener(this)
      UiThreadUtil.runOnUiThread { attach() }
    }
    return Arguments.makeNativeMap(snapshot.toMap())
  }

  override fun onHostResume() {
    // Also handles a recreated activity (e.g. after a configuration change).
    if (source == null || sourceActivity !== reactApplicationContext.currentActivity) {
      attach()
    }
  }

  override fun onHostPause() {
    // Stops the hinge sensor and all updates while in the background; JS
    // keeps the last snapshot until the app is back.
    detach()
  }

  override fun onHostDestroy() {
    detach()
  }

  override fun invalidate() {
    reactApplicationContext.removeLifecycleEventListener(this)
    UiThreadUtil.runOnUiThread { detach() }
    super.invalidate()
  }

  override fun onFoldSourceChanged() {
    update()
  }

  private fun attach() {
    detach()
    val activity = reactApplicationContext.currentActivity ?: return
    sourceActivity = activity
    source = WindowFoldSource.acquire(activity, this, wantsHingeAngle = true)
    update()
  }

  private fun detach() {
    source?.release(this)
    source = null
    sourceActivity = null
  }

  private fun update() {
    val state = source?.state ?: return
    val next = FoldMapper.windowState(
      folds = state.folds,
      cutouts = state.cutouts,
      windowWidthPx = state.metrics.widthPx,
      windowHeightPx = state.metrics.heightPx,
      density = state.metrics.density,
      hingeAngle = state.hingeAngle,
    )
    if (next == snapshot) return
    snapshot = next
    emitOnFoldStateChange(Arguments.makeNativeMap(next.toMap()))
  }

  companion object {
    const val NAME = "FoldKit"
  }
}
