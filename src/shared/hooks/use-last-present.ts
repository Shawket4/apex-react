import * as React from 'react';

/**
 * The last value that was not null.
 *
 * A dialog is told to close by clearing what it shows, and then takes a few
 * hundred milliseconds to leave. Reading its content through this keeps the
 * thing it was showing on screen for that time, instead of an empty box.
 *
 * The value must keep its identity between renders (state, or a memo): a new
 * object every render would be taken as a new value every render.
 */
export function useLastPresent<T>(value: T | null): T | null {
  const [last, setLast] = React.useState(value);
  if (value !== null && value !== last) setLast(value);
  return value ?? last;
}
