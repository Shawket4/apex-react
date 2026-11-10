import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Card, CardContent, CardHeader, CardTitle } from './card';

interface FormSectionProps {
  icon: LucideIcon;
  title: React.ReactNode;
  /** Shown at the end of the header: a total, a count. */
  aside?: React.ReactNode;
  /** Classes for the body. The default lays fields out two to a row. */
  className?: string;
  children: React.ReactNode;
}

/** One titled group of fields in a form: a card with a small-caps heading. */
export function FormSection({ icon: Icon, title, aside, className, children }: FormSectionProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
          {title}
        </CardTitle>
        {aside ? <div className="text-xs text-muted-foreground">{aside}</div> : null}
      </CardHeader>
      <CardContent className={cn('grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2', className)}>
        {children}
      </CardContent>
    </Card>
  );
}
