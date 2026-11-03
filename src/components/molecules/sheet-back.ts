import { createContext } from 'react';

/**
 * Set by the screen that stacks sheets: going back to the sheet that opened
 * the one on top. Only the top sheet is open, so it is the one that reads it.
 */
export const SheetBack = createContext<(() => void) | undefined>(undefined);
