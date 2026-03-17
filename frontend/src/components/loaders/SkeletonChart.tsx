/**
 * SkeletonChart Component
 * 
 * Animated skeleton loader for chart containers
 * Simulates bar chart or data visualization loading state
 * 
 * @example
 * <SkeletonChart />
 */
const SkeletonChart = () => {
  return (
    <div className="bg-white rounded-lg shadow p-6 animate-pulse">
      {/* Title */}
      <div className="h-5 bg-gray-200 rounded w-1/4 mb-6" />

      {/* Chart Area */}
      <div className="h-64 flex items-end gap-3 justify-around">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-gray-200 rounded-t"
            style={{ height: `${Math.random() * 100 + 40}px` }}
          />
        ))}
      </div>

      {/* Legend/Labels */}
      <div className="mt-6 flex gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-3 w-3 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkeletonChart;
