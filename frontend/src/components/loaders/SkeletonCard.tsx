/**
 * SkeletonCard Component
 * 
 * Animated skeleton loader for card containers
 * Uses pulse animation for smooth loading effect
 * 
 * @example
 * <SkeletonCard />
 */
const SkeletonCard = () => {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="h-6 bg-gray-200 rounded w-2/3" />
        </div>
        <div className="h-8 w-8 bg-gray-200 rounded" />
      </div>

      {/* Content Skeleton */}
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>

      {/* Footer Skeleton */}
      <div className="mt-4 flex gap-2">
        <div className="h-8 bg-gray-200 rounded w-24" />
        <div className="h-8 bg-gray-200 rounded w-24" />
      </div>
    </div>
  );
};

export default SkeletonCard;
