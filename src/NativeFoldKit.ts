import {
  TurboModuleRegistry,
  type CodegenTypes,
  type TurboModule,
} from 'react-native';

type NativeInsets = Readonly<{
  top: CodegenTypes.Double;
  left: CodegenTypes.Double;
  bottom: CodegenTypes.Double;
  right: CodegenTypes.Double;
}>;

type NativeRegion = Readonly<{
  x: CodegenTypes.Double;
  y: CodegenTypes.Double;
  width: CodegenTypes.Double;
  height: CodegenTypes.Double;
  isActive: boolean;
  margins: NativeInsets;
}>;

/**
 * Raw window-level fold state as reported by the platform.
 * Enum-like fields are plain strings on purpose: JS validates them in
 * `normalizeFoldState`, so a newer native side can't crash an older JS side.
 */
export type NativeFoldState = Readonly<{
  posture: string;
  hingeAngle: CodegenTypes.Double | null;
  horizontalSizeClass: string;
  verticalSizeClass: string;
  verticalBarEdge: string;
  folds: ReadonlyArray<NativeRegion>;
  occlusions: ReadonlyArray<NativeRegion>;
}>;

export interface Spec extends TurboModule {
  getFoldState(): NativeFoldState;
  readonly onFoldStateChange: CodegenTypes.EventEmitter<NativeFoldState>;
}

// `get`, not `getEnforcing`: importing the package must never throw. A missing
// module (not linked, unsupported platform, Jest without the mock) is handled
// in nativeFoldState.ts by falling back to defaults.
export default TurboModuleRegistry.get<Spec>('FoldKit');
