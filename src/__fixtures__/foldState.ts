export const rawFold = {
  x: 400,
  y: 0,
  width: 20,
  height: 900,
  isActive: true,
  margins: { top: 0, left: 4, bottom: 0, right: 4 },
};

/** `rawFold` after normalization. */
export const fold = { ...rawFold, orientation: 'vertical' as const };

export const rawCamera = {
  x: 382,
  y: 0,
  width: 84,
  height: 170,
  isActive: true,
  margins: { top: 0, left: 0, bottom: 0, right: 0 },
};

export const rawState = {
  posture: 'halfOpened',
  hingeAngle: 95.5,
  horizontalSizeClass: 'regular',
  verticalSizeClass: 'compact',
  verticalBarEdge: 'leading',
  folds: [rawFold],
  occlusions: [rawCamera],
};
