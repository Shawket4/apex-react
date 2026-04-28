import * as React from 'react';
import { GripHorizontal } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/* -------------------------------------------------------------------------- */
/* Draggable                                                                   */
/*                                                                             */
/* Pointer Events (mouse + touch + pen). Position lives in a ref + the DOM   */
/* `transform`, never React state, so move events do not re-render children. */
/* Optional `persistKey` writes the offset to localStorage. Bounds are       */
/* clamped against the viewport on every move and on resize.                 */
/*                                                                             */
/* JITTER FIX: do NOT apply `transition-transform` while dragging. The       */
/* drag loop writes `style.transform` directly on every pointer event; if    */
/* the browser also has a CSS transition active on `transform`, it tries    */
/* to animate between consecutive direct writes — visible as jitter at     */
/* high pointer velocity. The wrapper now has no transform-related CSS     */
/* during drag.                                                            */
/* -------------------------------------------------------------------------- */

interface DraggableProps {
  children: React.ReactNode;
  className?: string;
  initialPos?: { x: number; y: number };
  /** When set, save/restore offset to `localStorage[etit_drag_<key>]`. */
  persistKey?: string;
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
  const startRef = React.useRef<{
    pointerX: number;
    pointerY: number;
    baseX: number;
    baseY: number;
  } | null>(null);
  const draggingRef = React.useRef(false);

  /* Initial mount: restore persisted offset and apply via direct write. */
  React.useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;
    const persisted = persistKey ? loadPersisted(persistKey) : null;
    const start = persisted ?? initialPos;
    posRef.current = start;
    node.style.transform = `translate3d(${start.x}px, ${start.y}px, 0)`;

    requestAnimationFrame(() => {
      if (!wrapperRef.current) return;
      const clamped = clampToViewport(posRef.current, wrapperRef.current);
      if (clamped.x !== posRef.current.x || clamped.y !== posRef.current.y) {
        posRef.current = clamped;
        wrapperRef.current.style.transform = `translate3d(${clamped.x}px, ${clamped.y}px, 0)`;
        if (persistKey) savePersisted(persistKey, clamped);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Re-clamp on viewport resize. */
  React.useEffect(() => {
    const onResize = () => {
      const node = wrapperRef.current;
      if (!node) return;
      const clamped = clampToViewport(posRef.current, node);
      if (clamped.x !== posRef.current.x || clamped.y !== posRef.current.y) {
        posRef.current = clamped;
        node.style.transform = `translate3d(${clamped.x}px, ${clamped.y}px, 0)`;
        if (persistKey) savePersisted(persistKey, clamped);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [persistKey]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    const target = e.target as HTMLElement;
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
    draggingRef.current = true;
    if (wrapperRef.current) wrapperRef.current.style.cursor = 'grabbing';
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startRef.current || !wrapperRef.current) return;
    const next = {
      x: startRef.current.baseX + (e.clientX - startRef.current.pointerX),
      y: startRef.current.baseY + (e.clientY - startRef.current.pointerY),
    };
    const clamped = clampToViewport(next, wrapperRef.current);
    posRef.current = clamped;
    // Direct DOM write — no React render, no CSS transition fighting us.
    wrapperRef.current.style.transform = `translate3d(${clamped.x}px, ${clamped.y}px, 0)`;
  };

  const finishDrag = (e: React.PointerEvent) => {
    if (!startRef.current) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    startRef.current = null;
    draggingRef.current = false;
    if (wrapperRef.current) wrapperRef.current.style.cursor = '';
    if (persistKey) savePersisted(persistKey, posRef.current);
  };

  return (
    <div
      ref={wrapperRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      style={{ touchAction: 'none', willChange: 'transform' }}
      className={cn(
        // Note: NO transition-* classes here. CSS transitions on transform
        // collide with the imperative writes in handlePointerMove and
        // produce the visible jitter. The drag is already silky from
        // the direct GPU compositor path via translate3d.
        'group pointer-events-auto select-none',
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute top-1 start-1/2 -translate-x-1/2 z-10',
          'opacity-0 group-hover:opacity-50 transition-opacity duration-150',
        )}
      >
        <GripHorizontal className="h-3 w-3 text-foreground/70" />
      </div>
      {children}
    </div>
  );
}