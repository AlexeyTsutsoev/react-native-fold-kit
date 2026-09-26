// Thin ObjC++ Fabric component required by codegen.
// All logic lives in Swift (ios/Core/FoldRegionsObserver.swift); this file
// forwards lifecycle into it and converts its dictionaries to C++ events.

#import "FoldAwareView.h"

#import <react/renderer/components/FoldKitSpec/ComponentDescriptors.h>
#import <react/renderer/components/FoldKitSpec/EventEmitters.h>
#import <react/renderer/components/FoldKitSpec/Props.h>
#import <react/renderer/components/FoldKitSpec/RCTComponentViewHelpers.h>

#import "FoldKit-Swift.h"
#import "RCTFabricComponentsPlugins.h"

using namespace facebook::react;

namespace {

double doubleValue(NSDictionary *dict, NSString *key)
{
  id value = dict[key];
  return [value isKindOfClass:[NSNumber class]] ? [value doubleValue] : 0;
}

// Folds and occlusions are distinct codegen structs of identical shape.
template <typename Region>
std::vector<Region> regionsFromArray(id array)
{
  std::vector<Region> result;
  if (![array isKindOfClass:[NSArray class]]) {
    return result;
  }
  for (NSDictionary *dict in (NSArray *)array) {
    if (![dict isKindOfClass:[NSDictionary class]]) {
      continue;
    }
    NSDictionary *margins = [dict[@"margins"] isKindOfClass:[NSDictionary class]] ? dict[@"margins"] : @{};
    Region region{};
    region.x = doubleValue(dict, @"x");
    region.y = doubleValue(dict, @"y");
    region.width = doubleValue(dict, @"width");
    region.height = doubleValue(dict, @"height");
    region.isActive = [dict[@"isActive"] boolValue];
    region.margins.top = doubleValue(margins, @"top");
    region.margins.left = doubleValue(margins, @"left");
    region.margins.bottom = doubleValue(margins, @"bottom");
    region.margins.right = doubleValue(margins, @"right");
    result.push_back(region);
  }
  return result;
}

} // namespace

@implementation FoldAwareView {
  FKFoldRegionsObserver *_regionsObserver;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<FoldAwareViewComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const FoldAwareViewProps>();
    _props = defaultProps;

    _regionsObserver = [[FKFoldRegionsObserver alloc] initWithView:self];
    __weak FoldAwareView *weakSelf = self;
    _regionsObserver.onChange = ^BOOL(NSDictionary<NSString *, id> *regions) {
      return [weakSelf emitRegions:regions];
    };
  }
  return self;
}

- (void)updateProps:(const Props::Shared &)props oldProps:(const Props::Shared &)oldProps
{
  const auto &newViewProps = *std::static_pointer_cast<const FoldAwareViewProps>(props);
  _regionsObserver.includeInactive = newViewProps.includeInactive;

  [super updateProps:props oldProps:oldProps];
}

- (void)updateEventEmitter:(const EventEmitter::Shared &)eventEmitter
{
  [super updateEventEmitter:eventEmitter];
  // An update may have been dropped while there was no emitter yet.
  [_regionsObserver setNeedsUpdate];
}

- (void)updateLayoutMetrics:(const LayoutMetrics &)layoutMetrics
           oldLayoutMetrics:(const LayoutMetrics &)oldLayoutMetrics
{
  [super updateLayoutMetrics:layoutMetrics oldLayoutMetrics:oldLayoutMetrics];
  // Covers position changes too, which don't trigger our own layoutSubviews.
  [_regionsObserver setNeedsUpdate];
}

- (void)layoutSubviews
{
  [super layoutSubviews];
  [_regionsObserver setNeedsUpdate];
}

- (void)didMoveToWindow
{
  [super didMoveToWindow];
  [_regionsObserver setNeedsUpdate];
}

- (void)prepareForRecycle
{
  [super prepareForRecycle];
  [_regionsObserver reset];
}

- (BOOL)emitRegions:(NSDictionary<NSString *, id> *)regions
{
  if (!_eventEmitter) {
    return NO;
  }
  FoldAwareViewEventEmitter::OnRegionsChange event{
      .folds = regionsFromArray<FoldAwareViewEventEmitter::OnRegionsChangeFolds>(regions[@"folds"]),
      .occlusions = regionsFromArray<FoldAwareViewEventEmitter::OnRegionsChangeOcclusions>(regions[@"occlusions"]),
  };
  std::static_pointer_cast<const FoldAwareViewEventEmitter>(_eventEmitter)->onRegionsChange(std::move(event));
  return YES;
}

@end
