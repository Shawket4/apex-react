import * as React from 'react';
import { GripHorizontal } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/* -------------------------------------------------------------------------- */
/* Draggable                                                                   */
/*                                                                             */
/* Replaces the previous mouse-only implementation. Five fixes:               */
/*                                                                             */
/* 1. Pointer Events — works for mouse, touch (iPad), and Apple Pencil       */
/*    with a single listener path.                                            */
/* 2. Position is held in a ref + the DOM `transform`, not React state, so   */
/*    drag does not re-render the children at 120Hz.                         */
/* 3. Viewport bounds clamp on each move and on window resize.                */
/* 4. Optional `persistKey` saves the offset to localStorage and restores    */
/*    it on mount.                                                            */
/* 5. Drag handle is now actually visible — wrapper carries the `group`     */
/*    class so `group-hover` reveals it.                                     */
/*                                                                             */
/* RTL: positions use `transform: translate(...)` which is unaffected by    */
/* `direction`. The handle uses logical `start-1/2` rather than `left-1/2`. */
/* -------------------------------------------------------------------------- */

interface DraggableProps {
  children: React.ReactNode;
  className?: string;
  /** Initial offset from the wrapper's flow position. */
  initialPos?: { x: number; y: number };
  /** When set, save/restore offset to `localStorage[etit_drag_<key>]`. */
  persistKey?: string;
  /** Disable dragging (useful for the parent to lock during transitions). */
  disabled?: boolean;
}

const STORAGE_PREFIX = 'etit_drag_';

function loadPersisted(key: string): { x: number; y: number } | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') return parsed;
    return null;
  } catch {
    return null;
  }
}

function savePersisted(key: string, pos: { x: number; y: number }) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(pos));
  } catch {
    /* quota / private mode — ignore */
  }
}

function clampToViewport(
  pos: { x: number; y: number },
  el: HTMLElement,
): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Compute the wrapper's "neutral" position (current screen rect minus
  // the current transform offset) — that gives us the layout origin.
  // Then clamp so at least 40px stays on-screen on each axis.
  const min = 40;
  const originX = rect.left - pos.x;
  const originY = rect.top - pos.y;

  const minX = -originX + min - rect.width;
  const maxX = vw - originX - min;
  const minY = -originY + min - rect.height;
  const maxY = vh - originY - min;

  return {
    x: Math.max(minX, Math.min(maxX, pos.x)),
    y: Math.max(minY, Math.min(maxY, pos.y)),
  };
}

export function Draggable({
  children,
  className,
  initialPos = { x: 0, y: 0 },
  persistKey,
  disabled,
}: DraggableProps) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const posRef = React.useRef<{ x: number; y: number }>(initialPos);
  const startRef = React.useRef<{ pointerX: number; pointerY: number; baseX: number; baseY: number } | null>(null);
  const [dragging, setDragging] = React.useState(false);

  // Initial mount: restore persisted offset.
  React.useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;
    const persisted = persistKey ? loadPersisted(persistKey) : null;
    const start = persisted ?? initialPos;
    posRef.current = start;
    node.style.transform = `translate(${start.x}px, ${start.y}px)`;
    // After layout, re-clamp in case viewport changed since persist.
    requestAnimationFrame(() => {
      if (!wrapperRef.current) return;
      const clamped = clampToViewport(posRef.current, wrapperRef.current);
      if (clamped.x !== posRef.current.x || clamped.y !== posRef.current.y) {
        posRef.current = clamped;
        wrapperRef.current.style.transform = `translate(${clamped.x}px, ${clamped.y}px)`;
        if (persistKey) savePersisted(persistKey, clamped);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-clamp on window resize.
  React.useEffect(() => {
    const onResize = () => {
      const node = wrapperRef.current;
      if (!node) return;
      const clamped = clampToViewport(posRef.current, node);
      if (clamped.x !== posRef.current.x || clamped.y !== posRef.current.y) {
        posRef.current = clamped;
        node.style.transform = `translate(${clamped.x}px, ${clamped.y}px)`;
        if (persistKey) savePersisted(persistKey, clamped);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [persistKey]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    const target = e.target as HTMLElement;
    // Don't start a drag from interactive children.
    if (target.closest('button, input, select, textarea, [data-no-drag], [role="slider"]')) {
      return;
    }
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      baseX: posRef.current.x,
      baseY: posRef.current.y,
    };
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startRef.current || !wrapperRef.current) return;
    const next = {
      x: startRef.current.baseX + (e.clientX - startRef.current.pointerX),
      y: startRef.current.baseY + (e.clientY - startRef.current.pointerY),
    };
    const clamped = clampToViewport(next, wrapperRef.current);
    posRef.current = clamped;
    // Direct DOM write — no React render during drag.
    wrapperRef.current.style.transform = `translate(${clamped.x}px, ${clamped.y}px)`;
  };

  const finishDrag = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch { /* already released */ }
    startRef.current = null;
    setDragging(false);
    if (persistKey) savePersisted(persistKey, posRef.current);
  };

  return (
    <div
      ref={wrapperRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      style={{ touchAction: 'none', cursor: dragging ? 'grabbing' : undefined }}
      className={cn(
        'group pointer-events-auto select-none',
        // Soft scale during drag to confirm hand-off without affecting layout.
        dragging && 'scale-[1.01] transition-transform duration-100',
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-1 start-1/2 -translate-x-1/2 z-10',
          'opacity-0 group-hover:opacity-50 transition-opacity duration-150',
          dragging && 'opacity-90',
        )}
      >
        <GripHorizontal className="h-3 w-3 text-foreground/70" />
      </div>
      {children}
    </div>
  );
}
