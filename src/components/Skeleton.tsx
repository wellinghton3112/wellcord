"use client";

function SkeletonLine({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-border ${className}`} />;
}

export function MessageSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <SkeletonLine className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="flex items-center gap-2">
              <SkeletonLine className="h-4 w-24" />
              <SkeletonLine className="h-3 w-16" />
            </div>
            <SkeletonLine className="h-4 w-full" />
            <SkeletonLine className="h-4 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChannelSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <SkeletonLine key={i} className="h-8 w-full rounded-lg" />
      ))}
    </div>
  );
}

export function ServerSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 py-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonLine key={i} className="w-12 h-12 rounded-2xl" />
      ))}
    </div>
  );
}

export function MemberSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2 p-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <SkeletonLine className="w-8 h-8 rounded-full shrink-0" />
          <SkeletonLine className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
