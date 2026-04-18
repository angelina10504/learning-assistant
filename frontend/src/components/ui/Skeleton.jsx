function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-slate-700/50 rounded-lg ${className}`} />;
}

function CardSkeleton() {
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 space-y-3 border border-slate-700/50">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50 text-center space-y-3">
      <Skeleton className="h-8 w-8 rounded-full mx-auto" />
      <Skeleton className="h-8 w-16 mx-auto" />
      <Skeleton className="h-4 w-24 mx-auto" />
    </div>
  );
}

function TableRowSkeleton({ cols = 4 }) {
  return (
    <div className="flex gap-4 p-4 border-b border-slate-700/30">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}

function ChatBubbleSkeleton({ align = 'left' }) {
  return (
    <div className={`flex ${align === 'right' ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className="space-y-2 max-w-xs lg:max-w-md w-full">
        <Skeleton className={`h-4 ${align === 'right' ? 'w-3/4 ml-auto' : 'w-full'}`} />
        <Skeleton className={`h-4 ${align === 'right' ? 'w-1/2 ml-auto' : 'w-2/3'}`} />
      </div>
    </div>
  );
}

function TopicCardSkeleton() {
  return (
    <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 space-y-3 pl-16 relative">
      <Skeleton className="absolute left-4 top-4 w-7 h-7 rounded-full" />
      <Skeleton className="h-5 w-2/5" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </div>
  );
}

export { Skeleton, CardSkeleton, StatCardSkeleton, TableRowSkeleton, ChatBubbleSkeleton, TopicCardSkeleton };
export default Skeleton;
