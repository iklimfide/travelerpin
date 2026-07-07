import type { HTMLAttributes } from "react";

type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return <div className={`skeleton ${className}`.trim()} aria-hidden {...props} />;
}

export function SkeletonScreen({
  children,
  label = "Loading",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label={label}>
      {children}
    </div>
  );
}
