import { cn } from '@/shared/lib/cn';

/**
 * A placeholder. A highlight sweeps across it in the reading direction
 * (motion.css: transform only, reversed in RTL, stopped under reduced
 * motion). When data replaces it, wrap the pair in `SkeletonSwap` from
 * '@/shared/lib/motion' so the skeleton fades out before the content rises.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('motion-shimmer rounded-md bg-muted', className)} {...props} />;
}

export { Skeleton };
