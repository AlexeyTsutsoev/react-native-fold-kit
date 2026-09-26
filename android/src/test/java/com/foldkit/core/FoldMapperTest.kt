package com.foldkit.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class FoldMapperTest {
  // A book-style foldable, 2x density: 1600x1200 px window = 800x600 dp,
  // vertical hinge 40 px wide in the middle.
  private val density = 2f
  private val hinge = PxRect(780, 0, 820, 1200)
  private val window = PxRect(0, 0, 1600, 1200)

  private fun fold(halfOpened: Boolean = false, separating: Boolean = halfOpened) =
    FoldFeatureInput(hinge, isHalfOpened = halfOpened, isSeparating = separating)

  @Test
  fun `posture comes from the folding feature state`() {
    assertEquals(Posture.HALF_OPENED, FoldMapper.posture(listOf(fold(halfOpened = true)), hingeAngle = null))
    assertEquals(Posture.FLAT, FoldMapper.posture(listOf(fold()), hingeAngle = 180.0))
  }

  @Test
  fun `without a folding feature the posture comes from the hinge angle`() {
    // Folded device, split screen or a window on one half of the screen.
    assertEquals(Posture.FOLDED, FoldMapper.posture(emptyList(), hingeAngle = 5.0))
    assertEquals(Posture.HALF_OPENED, FoldMapper.posture(emptyList(), hingeAngle = 30.0))
    assertEquals(Posture.HALF_OPENED, FoldMapper.posture(emptyList(), hingeAngle = 90.0))
    assertEquals(Posture.FLAT, FoldMapper.posture(emptyList(), hingeAngle = 150.0))
    assertEquals(Posture.FLAT, FoldMapper.posture(emptyList(), hingeAngle = 180.0))
  }

  @Test
  fun `without a folding feature or a hinge sensor the posture is unknown`() {
    assertEquals(Posture.UNKNOWN, FoldMapper.posture(emptyList(), hingeAngle = null))
  }

  @Test
  fun `the folding feature wins over the hinge angle`() {
    assertEquals(Posture.FLAT, FoldMapper.posture(listOf(fold()), hingeAngle = 90.0))
  }

  @Test
  fun `size classes use material breakpoints`() {
    assertEquals(SizeClass.COMPACT, FoldMapper.widthSizeClass(599.9))
    assertEquals(SizeClass.REGULAR, FoldMapper.widthSizeClass(600.0))
    assertEquals(SizeClass.COMPACT, FoldMapper.heightSizeClass(479.0))
    assertEquals(SizeClass.REGULAR, FoldMapper.heightSizeClass(480.0))
    assertEquals(SizeClass.UNKNOWN, FoldMapper.widthSizeClass(0.0))
  }

  @Test
  fun `regions are converted to dp`() {
    val region = FoldMapper.region(hinge, density, isActive = true)
    assertEquals(FoldRegion(390.0, 0.0, 20.0, 600.0, isActive = true), region)
  }

  @Test
  fun `view regions are relative to the view`() {
    // Right half of the window, starting at the hinge.
    val view = PxRect(800, 100, 1600, 1200)
    val regions = FoldMapper.viewRegions(listOf(fold(halfOpened = true)), emptyList(), view, density, includeInactive = false)
    assertEquals(listOf(FoldRegion(-10.0, -50.0, 20.0, 600.0, isActive = true)), regions.folds)
  }

  @Test
  fun `non-separating folds are inactive and hidden by default`() {
    val folds = listOf(fold(halfOpened = false, separating = false))
    assertTrue(FoldMapper.viewRegions(folds, emptyList(), window, density, includeInactive = false).folds.isEmpty())
    val all = FoldMapper.viewRegions(folds, emptyList(), window, density, includeInactive = true).folds
    assertEquals(1, all.size)
    assertEquals(false, all[0].isActive)
  }

  @Test
  fun `regions outside the view are skipped`() {
    val leftHalf = PxRect(0, 0, 700, 1200)
    val camera = PxRect(1500, 0, 1560, 60)
    val regions = FoldMapper.viewRegions(listOf(fold(halfOpened = true)), listOf(camera), leftHalf, density, includeInactive = true)
    assertEquals(ViewRegionsSnapshot.EMPTY, regions)
  }

  @Test
  fun `a zero-width hinge still intersects the view it runs through`() {
    val hairline = FoldFeatureInput(PxRect(800, 0, 800, 1200), isHalfOpened = true, isSeparating = true)
    val regions = FoldMapper.viewRegions(listOf(hairline), emptyList(), window, density, includeInactive = false)
    assertEquals(1, regions.folds.size)
    assertEquals(0.0, regions.folds[0].width, 0.0)
  }

  @Test
  fun `cutouts become active occlusions sorted top to bottom`() {
    val lower = PxRect(100, 600, 160, 660)
    val upper = PxRect(1500, 0, 1560, 60)
    val occlusions = FoldMapper.viewRegions(emptyList(), listOf(lower, upper), window, density, includeInactive = false).occlusions
    assertEquals(listOf(0.0, 300.0), occlusions.map { it.y })
    assertTrue(occlusions.all { it.isActive })
  }

  @Test
  fun `window state combines posture, angle and size classes`() {
    val state = FoldMapper.windowState(listOf(fold(halfOpened = true)), emptyList(), 1600, 1200, density, hingeAngle = 95.04)
    assertEquals(Posture.HALF_OPENED, state.posture)
    assertEquals(95.0, state.hingeAngle!!, 0.0)
    assertEquals(SizeClass.REGULAR, state.horizontalSizeClass)
    assertEquals(SizeClass.REGULAR, state.verticalSizeClass)
    assertEquals(1, state.regions.folds.size)
  }

  @Test
  fun `hinge angle is rounded to a tenth of a degree`() {
    assertEquals(95.1, FoldMapper.roundAngle(95.06), 0.0)
    assertNull(FoldMapper.windowState(emptyList(), emptyList(), 100, 100, density, null).hingeAngle)
  }
}
