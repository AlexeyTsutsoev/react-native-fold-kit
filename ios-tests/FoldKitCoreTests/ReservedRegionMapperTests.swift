import Testing
import UIKit

@testable import FoldKitCore

private struct FakeRegion: ReservedRegionRepresentable {
  var frame: CGRect
  var margins: UIEdgeInsets = .zero
  var isActive: Bool = true
}

@Suite("Reserved region mapper")
struct ReservedRegionMapperTests {
  @Test("Filters inactive regions by default")
  func filtersInactiveRegionsByDefault() {
    let regions = [
      FakeRegion(frame: CGRect(x: 0, y: 0, width: 10, height: 10), isActive: true),
      FakeRegion(frame: CGRect(x: 0, y: 20, width: 10, height: 10), isActive: false),
    ]
    let mapped = ReservedRegionMapper.map(regions, includeInactive: false)
    #expect(mapped.map(\.frame.minY) == [0])
  }

  @Test("Includes inactive regions on request")
  func includesInactiveRegionsOnRequest() throws {
    let regions = [FakeRegion(frame: CGRect(x: 0, y: 0, width: 10, height: 10), isActive: false)]
    let mapped = ReservedRegionMapper.map(regions, includeInactive: true)
    let region = try #require(mapped.first)
    #expect(mapped.count == 1)
    #expect(!region.isActive)
  }

  @Test("Standardizes negative sizes")
  func standardizesNegativeSizes() throws {
    let regions = [FakeRegion(frame: CGRect(x: 10, y: 10, width: -4, height: -6))]
    let region = try #require(ReservedRegionMapper.map(regions, includeInactive: false).first)
    #expect(region.frame == CGRect(x: 6, y: 4, width: 4, height: 6))
  }

  @Test("Orders top to bottom, then left to right")
  func ordersTopToBottomThenLeftToRight() {
    let regions = [
      FakeRegion(frame: CGRect(x: 50, y: 100, width: 1, height: 1)),
      FakeRegion(frame: CGRect(x: 10, y: 100, width: 1, height: 1)),
      FakeRegion(frame: CGRect(x: 90, y: 0, width: 1, height: 1)),
    ]
    let origins = ReservedRegionMapper.map(regions, includeInactive: false).map(\.frame.origin)
    #expect(origins == [CGPoint(x: 90, y: 0), CGPoint(x: 10, y: 100), CGPoint(x: 50, y: 100)])
  }

  @Test("Keeps margins")
  func keepsMargins() throws {
    let margins = UIEdgeInsets(top: 1, left: 2, bottom: 3, right: 4)
    let regions = [FakeRegion(frame: .zero, margins: margins)]
    let region = try #require(ReservedRegionMapper.map(regions, includeInactive: false).first)
    #expect(region.margins == margins)
  }

  @Test("Reading regions of a detached view is safe")
  @MainActor
  func readingRegionsOfDetachedViewIsSafe() {
    let view = UIView(frame: CGRect(x: 0, y: 0, width: 100, height: 100))
    #expect(PlatformFoldAPI.readRegions(in: view, includeInactive: true) == .empty)
  }
}
