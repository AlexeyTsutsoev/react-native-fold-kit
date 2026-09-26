package com.foldkit

import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.FoldAwareViewManagerDelegate
import com.facebook.react.viewmanagers.FoldAwareViewManagerInterface

@ReactModule(name = FoldAwareViewManager.NAME)
class FoldAwareViewManager : ViewGroupManager<FoldAwareView>(),
  FoldAwareViewManagerInterface<FoldAwareView> {
  private val delegate = FoldAwareViewManagerDelegate(this)

  override fun getDelegate(): ViewManagerDelegate<FoldAwareView> = delegate

  override fun getName() = NAME

  override fun createViewInstance(context: ThemedReactContext) = FoldAwareView(context)

  override fun setIncludeInactive(view: FoldAwareView, value: Boolean) {
    view.includeInactive = value
  }

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
    mapOf(RegionsChangeEvent.EVENT_NAME to mapOf("registrationName" to "onRegionsChange"))

  companion object {
    const val NAME = "FoldAwareView"
  }
}
