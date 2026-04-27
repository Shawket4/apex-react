import * as React from 'react';
import { cn } from '@/shared/lib/cn';
import { GripHorizontal } from 'lucide-react';

interface DraggableProps {
  children: React.ReactNode;
  className?: string;
  initialPos?: { x: number; y: number };
}

export function Draggable({ children, className, initialPos = { x: 0, y: 0 } }: DraggableProps) {
  const [pos, setPos] = React.useState(initialPos);
  const [dragging, setDragging] = React.useState(false);
  const offsetRef = React.useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow dragging via the handle (optional, but better UX)
    // For now we allow dragging via anything except buttons/inputs
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    setDragging(true);
    offsetRef.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
  };

  React.useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPos({
        x: e.clientX - offsetRef.current.x,
        y: e.clientY - offsetRef.current.y,
      });
    };

    const handleMouseUp = () => setDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  return (
    <div
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        cursor: dragging ? 'grabbing' : 'default',
      }}
      onMouseDown={handleMouseDown}
      className={cn('pointer-events-auto transition-transform duration-75', className)}
    >
      <div className="absolute top-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-40 transition-opacity cursor-grab active:cursor-grabbing">
        <GripHorizontal className="h-3 w-3" />
      </div>
      {children}
    </div>
  );
}
