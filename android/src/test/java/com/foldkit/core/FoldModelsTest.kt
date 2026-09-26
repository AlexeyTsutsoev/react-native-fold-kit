package com.foldkit.core

import org.junit.Assert.assertEquals
import org.junit.Test

class FoldModelsTest {
  /** Keys must match `NativeFoldState` in src/NativeFoldKit.ts (same check as the Swift tests). */
  @Test
  fun `unsupported state matches the JS contract`() {
    val map = FoldStateSnapshot.UNSUPPORTED.toMap()
    assertEquals(
      setOf("posture", "hingeAngle", "horizontalSizeClass", "verticalSizeClass", "verticalBarEdge", "folds", "occlusions"),
      map.keys,
    )
    assertEquals("unknown", map["posture"])
    assertEquals(null, map["hingeAngle"])
    assertEquals("unknown", map["horizontalSizeClass"])
    assertEquals("none", map["verticalBarEdge"])
    assertEquals(emptyList<Any>(), map["folds"])
  }

  /** Keys must match `NativeRegionsChangeEvent` in src/FoldAwareViewNativeComponent.ts. */
  @Test
  fun `region map matches the JS contract`() {
    val map = FoldRegion(1.0, 2.0, 3.0, 4.0, isActive = true).toMap()
    assertEquals(
      mapOf(
        "x" to 1.0, "y" to 2.0, "width" to 3.0, "height" to 4.0, "isActive" to true,
        "margins" to mapOf("top" to 0.0, "left" to 0.0, "bottom" to 0.0, "right" to 0.0),
      ),
      map,
    )
    assertEquals(setOf("folds", "occlusions"), ViewRegionsSnapshot.EMPTY.toMap().keys)
  }

  @Test
  fun `posture js names match src types`() {
    assertEquals(listOf("flat", "halfOpened", "folded", "unknown"), Posture.entries.map { it.jsName })
    assertEquals(listOf("compact", "regular", "unknown"), SizeClass.entries.map { it.jsName })
  }
}
