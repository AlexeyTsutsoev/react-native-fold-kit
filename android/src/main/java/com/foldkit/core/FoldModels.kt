package com.foldkit.core

// Plain JVM models (no android.* imports) so they are unit-testable without a
// device. Mirrors ios/Core/FoldModels.swift; `toMap()` keys are the contract
// with src/NativeFoldKit.ts and src/FoldAwareViewNativeComponent.ts.

data class Insets(val top: Double, val left: Double, val bottom: Double, val right: Double) {
  fun toMap(): Map<String, Any?> = mapOf("top" to top, "left" to left, "bottom" to bottom, "right" to right)

  companion object {
    val ZERO = Insets(0.0, 0.0, 0.0, 0.0)
  }
}

/** A reserved region (fold or occlusion) in dp, relative to some view or the window. */
data class FoldRegion(
  val x: Double,
  val y: Double,
  val width: Double,
  val height: Double,
  val isActive: Boolean,
  val margins: Insets = Insets.ZERO,
) {
  fun toMap(): Map<String, Any?> = mapOf(
    "x" to x,
    "y" to y,
    "width" to width,
    "height" to height,
    "isActive" to isActive,
    "margins" to margins.toMap(),
  )
}

data class ViewRegionsSnapshot(val folds: List<FoldRegion>, val occlusions: List<FoldRegion>) {
  fun toMap(): Map<String, Any?> = mapOf(
    "folds" to folds.map { it.toMap() },
    "occlusions" to occlusions.map { it.toMap() },
  )

  companion object {
    val EMPTY = ViewRegionsSnapshot(emptyList(), emptyList())
  }
}

enum class Posture(val jsName: String) {
  FLAT("flat"),
  HALF_OPENED("halfOpened"),
  FOLDED("folded"),
  UNKNOWN("unknown"),
}

enum class SizeClass(val jsName: String) {
  COMPACT("compact"),
  REGULAR("regular"),
  UNKNOWN("unknown"),
}

/** Window-level state. */
data class FoldStateSnapshot(
  val posture: Posture,
  /** Degrees 0–360 (0 closed, 180 flat), `null` without a hinge angle sensor. */
  val hingeAngle: Double?,
  val horizontalSizeClass: SizeClass,
  val verticalSizeClass: SizeClass,
  val regions: ViewRegionsSnapshot,
) {
  fun toMap(): Map<String, Any?> = mapOf(
    "posture" to posture.jsName,
    "hingeAngle" to hingeAngle,
    "horizontalSizeClass" to horizontalSizeClass.jsName,
    "verticalSizeClass" to verticalSizeClass.jsName,
    // iOS-only concept.
    "verticalBarEdge" to "none",
    "folds" to regions.folds.map { it.toMap() },
    "occlusions" to regions.occlusions.map { it.toMap() },
  )

  companion object {
    val UNSUPPORTED = FoldStateSnapshot(
      posture = Posture.UNKNOWN,
      hingeAngle = null,
      horizontalSizeClass = SizeClass.UNKNOWN,
      verticalSizeClass = SizeClass.UNKNOWN,
      regions = ViewRegionsSnapshot.EMPTY,
    )
  }
}
