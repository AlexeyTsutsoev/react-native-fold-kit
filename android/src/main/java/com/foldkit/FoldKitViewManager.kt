package com.foldkit

import android.graphics.Color
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.FoldKitViewManagerInterface
import com.facebook.react.viewmanagers.FoldKitViewManagerDelegate

@ReactModule(name = FoldKitViewManager.NAME)
class FoldKitViewManager : SimpleViewManager<FoldKitView>(),
  FoldKitViewManagerInterface<FoldKitView> {
  private val mDelegate: ViewManagerDelegate<FoldKitView>

  init {
    mDelegate = FoldKitViewManagerDelegate(this)
  }

  override fun getDelegate(): ViewManagerDelegate<FoldKitView>? {
    return mDelegate
  }

  override fun getName(): String {
    return NAME
  }

  public override fun createViewInstance(context: ThemedReactContext): FoldKitView {
    return FoldKitView(context)
  }

  @ReactProp(name = "color")
  override fun setColor(view: FoldKitView?, color: Int?) {
    view?.setBackgroundColor(color ?: Color.TRANSPARENT)
  }

  companion object {
    const val NAME = "FoldKitView"
  }
}
