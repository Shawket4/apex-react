/* -------------------------------------------------------------------------- */
/* Intent                                                                      */
/*                                                                            */
/* One definition of "the user is about to do this": pointer enters the        */
/* control, keyboard focus lands on it, or a finger touches it. Every surface  */
/* that warms anything spreads these three handlers — never a hand-rolled      */
/* subset, because the subset always forgets touch or keyboard and the warm    */
/* quietly stops working for those users.                                      */
/*                                                                            */
/* The warm callback MUST be idempotent-cheap: chunk imports dedupe by module, */
/* prefetchQuery dedupes in flight and respects staleTime, so firing on every  */
/* re-hover costs nothing. If a warm is not cheap to repeat, fix the warm.     */
/* -------------------------------------------------------------------------- */

export interface IntentHandlers {
  onPointerEnter: () => void;
  onFocus: () => void;
  onTouchStart: () => void;
}

/** Spread onto any interactive element: `<button {...intentProps(warm)} />` */
export function intentProps(warm: () => void): IntentHandlers {
  return { onPointerEnter: warm, onFocus: warm, onTouchStart: warm };
}
