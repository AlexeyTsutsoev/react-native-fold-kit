package com.foldkit.core

import kotlin.math.roundToInt

/** Integer pixel rect, `right`/`bottom` exclusive (like android.graphics.Rect). */
data class PxRect(val left: Int, val top: Int, val right: Int, val bottom: Int) {
  val width: Int get() = right - left
  val height: Int get() = bottom - top

  fun intersects(other: PxRect): Boolean =
    left < other.right && other.left < right && top < other.bottom && other.top < bottom
}

/** The parts of androidx.window's FoldingFeature we use, in window pixels. */
data class FoldFeatureInput(
  val bounds: PxRect,
  val isHalfOpened: Boolean,
  val isSeparating: Boolean,
)

/**
 * Pure mapping from Android window data to the JS contract. The Android layer
 * (WindowFoldSource, FoldAwareView) only collects inputs and calls this.
 */
object FoldMapper {
  /** Material window size class breakpoints, collapsed to iOS' two classes. */
  const val REGULAR_MIN_WIDTH_DP = 600.0
  const val REGULAR_MIN_HEIGHT_DP = 480.0

  /**
   * Hinge angle ranges used when the window has no FoldingFeature (folded
   * device, split screen, window on one half of the screen). They match the
   * emulator's posture definitions: closed 0–30°, half-opened 30–150°,
   * opened 150°+.
   */
  const val FOLDED_MAX_ANGLE = 30.0
  const val HALF_OPENED_MAX_ANGLE = 150.0

  fun posture(folds: List<FoldFeatureInput>, hingeAngle: Double?): Posture = when {
    // FoldingFeature is authoritative, but only exists while the window
    // crosses the fold.
    folds.any { it.isHalfOpened } -> Posture.HALF_OPENED
    folds.isNotEmpty() -> Posture.FLAT
    // Otherwise the hinge sensor is the only source; without it (regular
    // phones) the posture is unknown.
    hingeAngle == null -> Posture.UNKNOWN
    hingeAngle < FOLDED_MAX_ANGLE -> Posture.FOLDED
    hingeAngle < HALF_OPENED_MAX_ANGLE -> Posture.HALF_OPENED
    else -> Posture.FLAT
  }

  fun widthSizeClass(widthDp: Double): SizeClass = when {
    widthDp <= 0 -> SizeClass.UNKNOWN
    widthDp < REGULAR_MIN_WIDTH_DP -> SizeClass.COMPACT
    else -> SizeClass.REGULAR
  }

  fun heightSizeClass(heightDp: Double): SizeClass = when {
    heightDp <= 0 -> SizeClass.UNKNOWN
    heightDp < REGULAR_MIN_HEIGHT_DP -> SizeClass.COMPACT
    else -> SizeClass.REGULAR
  }

  /** Window px rect → dp region relative to `origin` (a view's position in the window). */
  fun region(rect: PxRect, density: Float, isActive: Boolean, origin: PxRect? = null): FoldRegion {
    val dx = origin?.left ?: 0
    val dy = origin?.top ?: 0
    return FoldRegion(
      x = toDp(rect.left - dx, density),
      y = toDp(rect.top - dy, density),
      width = toDp(rect.width, density),
      height = toDp(rect.height, density),
      isActive = isActive,
    )
  }

  /**
   * Regions for a view at `viewInWindow`: only those intersecting it, in its
   * coordinates. A fold is active when it separates content (half-opened, or a
   * physical gap); display cutouts are always active occlusions.
   */
  fun viewRegions(
    folds: List<FoldFeatureInput>,
    cutouts: List<PxRect>,
    viewInWindow: PxRect,
    density: Float,
    includeInactive: Boolean,
  ): ViewRegionsSnapshot {
    val foldRegions = folds
      .filter { includeInactive || it.isSeparating }
      .filter { it.bounds.intersectsOrTouches(viewInWindow) }
      .map { region(it.bounds, density, it.isSeparating, viewInWindow) }
    val occlusionRegions = cutouts
      .filter { it.intersects(viewInWindow) }
      .map { region(it, density, isActive = true, origin = viewInWindow) }
    return ViewRegionsSnapshot(sorted(foldRegions), sorted(occlusionRegions))
  }

  fun windowState(
    folds: List<FoldFeatureInput>,
    cutouts: List<PxRect>,
    windowWidthPx: Int,
    windowHeightPx: Int,
    density: Float,
    hingeAngle: Double?,
  ): FoldStateSnapshot {
    val window = PxRect(0, 0, windowWidthPx, windowHeightPx)
    return FoldStateSnapshot(
      posture = posture(folds, hingeAngle),
      hingeAngle = hingeAngle?.let { roundAngle(it) },
      horizontalSizeClass = widthSizeClass(toDp(windowWidthPx, density)),
      verticalSizeClass = heightSizeClass(toDp(windowHeightPx, density)),
      regions = viewRegions(folds, cutouts, window, density, includeInactive = false),
    )
  }

  /** Sensor noise below 0.1° would otherwise produce an event per reading. */
  fun roundAngle(degrees: Double): Double = (degrees * 10).roundToInt() / 10.0

  private fun toDp(px: Int, density: Float): Double =
    if (density > 0) px / density.toDouble() else px.toDouble()

  // A hinge without a physical gap has zero width; it still "intersects" a
  // view it runs through.
  private fun PxRect.intersectsOrTouches(other: PxRect): Boolean =
    if (width == 0 || height == 0) {
      left <= other.right && other.left <= right && top <= other.bottom && other.top <= bottom
    } else {
      intersects(other)
    }

  private fun sorted(regions: List<FoldRegion>) =
    regions.sortedWith(compareBy({ it.y }, { it.x }))
}
