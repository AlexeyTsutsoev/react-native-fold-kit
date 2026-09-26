import {
  codegenNativeComponent,
  type CodegenTypes,
  type HostComponent,
  type ViewProps,
} from 'react-native';

// Codegen limitations for component events: payload types must be declared in
// this file, arrays must use `T[]`, and array elements must be inline object
// literals (type aliases are not resolved there). Hence the repetition.
export type NativeRegionsChangeEvent = Readonly<{
  folds: {
    x: CodegenTypes.Double;
    y: CodegenTypes.Double;
    width: CodegenTypes.Double;
    height: CodegenTypes.Double;
    isActive: boolean;
    margins: {
      top: CodegenTypes.Double;
      left: CodegenTypes.Double;
      bottom: CodegenTypes.Double;
      right: CodegenTypes.Double;
    };
  }[];
  occlusions: {
    x: CodegenTypes.Double;
    y: CodegenTypes.Double;
    width: CodegenTypes.Double;
    height: CodegenTypes.Double;
    isActive: boolean;
    margins: {
      top: CodegenTypes.Double;
      left: CodegenTypes.Double;
      bottom: CodegenTypes.Double;
      right: CodegenTypes.Double;
    };
  }[];
}>;

export interface NativeProps extends ViewProps {
  includeInactive?: CodegenTypes.WithDefault<boolean, false>;
  onRegionsChange?: CodegenTypes.DirectEventHandler<NativeRegionsChangeEvent>;
}

export default codegenNativeComponent<NativeProps>(
  'FoldAwareView'
) as HostComponent<NativeProps>;
