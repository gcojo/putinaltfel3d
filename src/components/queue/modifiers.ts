import type { Modifier } from '@dnd-kit/core';

/** Restricționează tragerea pe verticală (fără pachetul @dnd-kit/modifiers). */
export const restrictToVerticalAxisModifier: Modifier = ({ transform }) => ({ ...transform, x: 0 });
