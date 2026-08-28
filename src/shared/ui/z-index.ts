/* -------------------------------------------------------------------------- */
/* Stacking order for portalled UI                                             */
/*                                                                            */
/* Everything below renders into document.body rather than in place, so their  */
/* order on screen is decided entirely by z-index and not by where they sit in */
/* the tree. That made them easy to get wrong, and it was wrong: dropdowns sat */
/* at z-50 while the mobile drawer sat at z-[9999], so every menu opened from  */
/* inside the drawer rendered BEHIND its overlay. Taps landed on the overlay,  */
/* which closed the drawer — so the sidebar's theme, language and user menus   */
/* did nothing on a phone while working perfectly on a laptop.                 */
/*                                                                            */
/* The rule is simple and worth keeping: a TRANSIENT overlay always floats     */
/* above the CONTAINER it was opened from, because it is opened from one by    */
/* definition. Containers stack among themselves; transients sit above all of  */
/* them.                                                                       */
/* -------------------------------------------------------------------------- */

/** Drawers, dialogs, and anything else that hosts other controls. */
export const CONTAINER_Z = 'z-[9999]';

/** A drawer opened on top of another drawer. */
export const STACKED_CONTAINER_Z = 'z-[10050]';

/**
 * Menus, popovers, selects and tooltips.
 *
 * Above every container, including a stacked one, because any of them can be
 * opened from inside any container.
 */
export const OVERLAY_Z = 'z-[10100]';
