// Thin ObjC++ entry point required by TurboModule codegen.
// All logic lives in Swift (ios/Core/FoldStateObserver.swift).

#import <FoldKitSpec/FoldKitSpec.h>
#import <React/RCTInvalidating.h>

#import "FoldKit-Swift.h"

@interface FoldKit : NativeFoldKitSpecBase <NativeFoldKitSpec, RCTInvalidating>
@end

@implementation FoldKit {
  FKFoldStateObserver *_observer;
  BOOL _started;
}

+ (NSString *)moduleName
{
  return @"FoldKit";
}

- (instancetype)init
{
  if (self = [super init]) {
    _observer = [FKFoldStateObserver new];
    __weak FoldKit *weakSelf = self;
    _observer.onChange = ^(NSDictionary<NSString *, id> *state) {
      [weakSelf emitOnFoldStateChange:state];
    };
  }
  return self;
}

- (NSDictionary *)getFoldState
{
  // Start lazily: by the time JS calls a method the event emitter callback is
  // installed, so the first state update is never dropped.
  if (!_started) {
    _started = YES;
    [_observer start];
  }
  return [_observer currentState];
}

- (void)invalidate
{
  [_observer stop];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeFoldKitSpecJSI>(params);
}

@end
