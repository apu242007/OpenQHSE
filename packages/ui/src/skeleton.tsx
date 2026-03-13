import * as React from 'react';
import { cn } from './lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-surface-alt', className)}
      {...props}
    />
  );
}

export { Skeleton };
