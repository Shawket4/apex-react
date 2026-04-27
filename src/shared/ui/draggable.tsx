import * as React from 'react';
import { cn } from '@/shared/lib/cn';
import { GripHorizontal } from 'lucide-react';

interface DraggableProps {
  id: string; // Required for localStorage persistence
  children: React.ReactNode;
  className?: string;
  initialPos?: { x: number; y: number };
}

export function Draggable({ id, children, className, initialPos = { x: 0, y: 0 } }: DraggableProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef({ isDragging: false, startX: 0, startY: 0, currentX: 0, currentY: 0 });

  React.useEffect(() => {
    // Load persisted position on mount
    try {
      const saved = window.localStorage.getItem(`etit_draggable_${id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        dragRef.current.currentX = parsed.x;
        dragRef.current.currentY = parsed.y;
      } else {
        dragRef.current.currentX = initialPos.x;
        dragRef.current.currentY = initialPos.y;
      }
    } catch {
      dragRef.current.currentX = initialPos.x;
      dragRef.current.currentY = initialPos.y;
    }

    if (containerRef.current) {
      containerRef.current.style.transform = `translate3d(${dragRef.current.currentX}px, ${dragRef.current.currentY}px, 0)`;
    }
  }, [id, initialPos.x, initialPos.y]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    dragRef.current.isDragging = true;
    dragRef.current.startX = e.clientX - dragRef.current.currentX;
    dragRef.current.startY = e.clientY - dragRef.current.currentY;

    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
      containerRef.current.style.transition = 'none'; // Prevent transition lag during drag
      containerRef.current.style.cursor = 'grabbing';
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDragging || !containerRef.current) return;

    let newX = e.clientX - dragRef.current.startX;
    let newY = e.clientY - dragRef.current.startY;

    // Viewport bounds clamping
    const rect = containerRef.current.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;

    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));

    dragRef.current.currentX = newX;
    dragRef.current.currentY = newY;
    containerRef.current.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDragging) return;
    dragRef.current.isDragging = false;

    if (containerRef.current) {
      containerRef.current.releasePointerCapture(e.pointerId);
      containerRef.current.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
      containerRef.current.style.cursor = 'default';
    }

    try {
      window.localStorage.setItem(
        `etit_draggable_${id}`,
        JSON.stringify({ x: dragRef.current.currentX, y: dragRef.current.currentY })
      );
    } catch { /* ignore */ }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={cn('pointer-events-auto group touch-none', className)}
      style={{ touchAction: 'none' }}
    >
      <div className="absolute top-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-40 transition-opacity cursor-grab active:cursor-grabbing z-50 p-2">
        <GripHorizontal className="h-4 w-4 text-foreground/50" />
      </div>
      {children}
    </div>
  );
}