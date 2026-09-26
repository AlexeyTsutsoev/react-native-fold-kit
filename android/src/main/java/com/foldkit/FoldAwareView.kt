package com.foldkit

import android.view.ViewTreeObserver
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.common.UIManagerType
import com.facebook.react.uimanager.events.Event
import com.facebook.react.views.view.ReactViewGroup
import com.foldkit.core.FoldMapper
import com.foldkit.core.PxRect
import com.foldkit.core.ViewRegionsSnapshot

/**
 * Container that reports folds and occlusions intersecting it, in its own
 * coordinates (dp). Android counterpart of ios/FoldAwareView.mm +
 * ios/Core/FoldRegionsObserver.swift.
 *
 * Unlike iOS, Android notifies about scrolling and global layout, so the view
 * also stays correct when an ancestor moves it (e.g. inside a ScrollView).
 * Those notifications fire for any scroll/layout in the window, so an update
 * first compares the view's position and the shared source's version, and
 * only maps regions when one of them changed.
 */
class FoldAwareView(private val reactContext: ThemedReactContext) :
  ReactViewGroup(reactContext),
  WindowFoldSource.Listener,
  LifecycleEventListener {

  var includeInactive: Boolean = false
    set(value) {
      if (field != value) {
        field = value
        lastInputs = null
        scheduleUpdate()
      }
    }

  private var source: WindowFoldSource? = null
  private var lastDelivered: ViewRegionsSnapshot? = null
  /** Position in window + source version of the last computation. */
  private var lastInputs: Pair<PxRect, Int>? = null
  private var updateScheduled = false
  private var retriesLeft = 0
  private val location = IntArray(2)

  private val globalLayoutListener = ViewTreeObserver.OnGlobalLayoutListener { scheduleUpdate() }
  private val scrollListener = ViewTreeObserver.OnScrollChangedListener { scheduleUpdate() }
  private val updateRunnable = Runnable {
    updateScheduled = false
    update()
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    lastDelivered = null
    lastInputs = null
    retriesLeft = MAX_RETRIES
    acquireSource()
    reactContext.addLifecycleEventListener(this)
    viewTreeObserver.addOnGlobalLayoutListener(globalLayoutListener)
    viewTreeObserver.addOnScrollChangedListener(scrollListener)
    scheduleUpdate()
  }

  override fun onDetachedFromWindow() {
    viewTreeObserver.removeOnGlobalLayoutListener(globalLayoutListener)
    viewTreeObserver.removeOnScrollChangedListener(scrollListener)
    reactContext.removeLifecycleEventListener(this)
    removeCallbacks(updateRunnable)
    updateScheduled = false
    releaseSource()
    super.onDetachedFromWindow()
  }

  override fun onFoldSourceChanged() = scheduleUpdate()

  // The activity may not exist yet when the view is attached.
  override fun onHostResume() {
    if (source == null && isAttachedToWindow) {
      acquireSource()
      scheduleUpdate()
    }
  }

  override fun onHostPause() = Unit

  override fun onHostDestroy() = releaseSource()

  private fun acquireSource() {
    if (source != null) return
    val activity = reactContext.currentActivity ?: return
    source = WindowFoldSource.acquire(activity, this, wantsHingeAngle = false)
  }

  private fun releaseSource() {
    source?.release(this)
    source = null
  }

  /** Coalesces bursts (layout + scroll + fold change) into one read per frame. */
  private fun scheduleUpdate() {
    if (updateScheduled || !isAttachedToWindow) return
    updateScheduled = true
    postOnAnimation(updateRunnable)
  }

  private fun update() {
    val source = source ?: return
    getLocationInWindow(location)
    val viewInWindow = PxRect(location[0], location[1], location[0] + width, location[1] + height)
    val inputs = viewInWindow to source.version
    if (inputs == lastInputs) return

    val state = source.state
    val snapshot = FoldMapper.viewRegions(
      folds = state.folds,
      cutouts = state.cutouts,
      viewInWindow = viewInWindow,
      density = state.metrics.density,
      includeInactive = includeInactive,
    )
    if (snapshot == lastDelivered) {
      lastInputs = inputs
      return
    }
    if (dispatchRegionsChange(snapshot)) {
      lastDelivered = snapshot
      lastInputs = inputs
    } else if (retriesLeft > 0) {
      // No event dispatcher yet (e.g. right after mount): retry next frame
      // instead of waiting for an unrelated layout or scroll.
      retriesLeft -= 1
      scheduleUpdate()
    }
  }

  private fun dispatchRegionsChange(snapshot: ViewRegionsSnapshot): Boolean {
    // The only overload available in every supported RN version (0.82+): the
    // one-argument replacement doesn't exist in 0.82, this one is deprecated
    // in newer versions but still works.
    @Suppress("DEPRECATION")
    val dispatcher =
      UIManagerHelper.getEventDispatcher(reactContext, UIManagerType.FABRIC) ?: return false
    val surfaceId = UIManagerHelper.getSurfaceId(this)
    dispatcher.dispatchEvent(RegionsChangeEvent(surfaceId, id, snapshot))
    return true
  }

  private companion object {
    const val MAX_RETRIES = 10
  }
}

/** Builds a fresh map on every `getEventData()` call: native maps are single-use. */
class RegionsChangeEvent(surfaceId: Int, viewId: Int, private val snapshot: ViewRegionsSnapshot) :
  Event<RegionsChangeEvent>(surfaceId, viewId) {
  override fun getEventName() = EVENT_NAME

  override fun getEventData(): WritableMap = Arguments.makeNativeMap(snapshot.toMap())

  companion object {
    const val EVENT_NAME = "topRegionsChange"
  }
}
