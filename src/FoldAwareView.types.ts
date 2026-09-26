import type { ViewProps } from 'react-native';
import type { ViewRegions } from './types';

export type FoldAwareViewProps = ViewProps & {
  /** Also report regions that are currently inactive. Defaults to `false`. */
  includeInactive?: boolean;
  onRegionsChange?: (regions: ViewRegions) => void;
};
