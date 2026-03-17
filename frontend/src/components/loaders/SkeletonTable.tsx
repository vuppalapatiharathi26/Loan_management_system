interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

/**
 * SkeletonTable Component
 * 
 * Animated skeleton loader for table data
 * Displays multiple rows with column placeholders
 * 
 * @example
 * <SkeletonTable rows={5} columns={4} />
 */
const SkeletonTable = ({ rows = 5, columns = 4 }: SkeletonTableProps) => {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 animate-pulse">
        <div className="flex gap-4 p-4">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={`header-${i}`} className="flex-1 h-4 bg-gray-200 rounded" />
          ))}
        </div>
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="border-t animate-pulse">
          <div className="flex gap-4 p-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={`col-${colIndex}`}
                className="flex-1 h-4 bg-gray-200 rounded"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkeletonTable;
