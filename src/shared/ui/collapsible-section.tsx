import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Card } from './card';

interface CollapsibleSectionProps {
  /** Header content — typically a title + small subtitle / counts */
  title: React.ReactNode;
  /** Optional right-aligned content in the header (badges, action buttons) */
  actions?: React.ReactNode;
  /** Optional icon shown before the title */
  icon?: React.ReactNode;
  /** Whether the section starts open. Defaults to true. */
  defaultOpen?: boolean;
  /** Render a controlled-open variant — pass `open` + `onOpenChange` */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  /** Disable collapsing entirely — useful for always-on sections */
  alwaysOpen?: boolean;
  children?: React.ReactNode;
}

/**
 * A card whose body can collapse behind a chevron-toggle header.
 *
 * Used heavily in dashboard / statistics views where a page has many sections
 * but the user only wants to dig into a few at a time. Supports both
 * uncontrolled (`defaultOpen`) and controlled (`open` + `onOpenChange`) modes.
 *
 * Header is keyboard-accessible (Enter/Space toggle) when collapsing is
 * enabled. The chevron rotates and the body uses a simple show/hide; we
 * deliberately don't animate the height so long sections don't feel sluggish.
 */
export function CollapsibleSection({
  title,
  actions,
  icon,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  className,
  alwaysOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const isOpen = alwaysOpen || (isControlled ? controlledOpen : uncontrolledOpen);

  const toggle = () => {
    if (alwaysOpen) return;
    if (isControlled) {
      onOpenChange?.(!isOpen);
    } else {
      setUncontrolledOpen((v) => !v);
    }
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div
        className={cn(
          'flex items-center gap-3 border-b px-4 py-3 md:px-5 md:py-3.5',
          !alwaysOpen && 'cursor-pointer select-none transition-colors hover:bg-muted/40',
        )}
        role={alwaysOpen ? undefined : 'button'}
        tabIndex={alwaysOpen ? undefined : 0}
        aria-expanded={alwaysOpen ? undefined : isOpen}
        onClick={alwaysOpen ? undefined : toggle}
        onKeyDown={
          alwaysOpen
            ? undefined
            : (e) => {
                if (
                  (e.key === 'Enter' || e.key === ' ') &&
                  e.target === e.currentTarget
                ) {
                  e.preventDefault();
                  toggle();
                }
              }
        }
      >
        {icon && <div className="flex shrink-0 items-center">{icon}</div>}
        <div className="min-w-0 flex-1">{title}</div>
        {actions && (
          <div
            className="flex items-center gap-2"
            // Stop click propagation so action buttons don't toggle the section
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        )}
        {!alwaysOpen && (
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              isOpen && 'rotate-180',
            )}
          />
        )}
      </div>
      {isOpen && <div>{children}</div>}
    </Card>
  );
}
