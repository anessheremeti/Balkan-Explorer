import React from "react";
import { motion } from "motion/react";

interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  circle?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({
  width = "w-full",
  height = "h-6",
  className = "",
  circle = false,
}) => {
  return (
    <motion.div
      className={`bg-slate-300 dark:bg-slate-700 ${width} ${height} ${
        circle ? "rounded-full" : "rounded-lg"
      } ${className}`}
      animate={{ opacity: [0.5, 0.8, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      aria-busy="true"
      aria-label="Loading"
    />
  );
};

const DestinationDetailSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Hero Image Skeleton */}
      <Skeleton height="h-96 sm:h-[500px] md:h-[600px]" />

      {/* Thumbnails Skeleton */}
      <div className="flex gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton
            key={i}
            width="w-20 sm:w-24"
            height="h-20 sm:h-24"
            className="shrink-0"
          />
        ))}
      </div>

      {/* Content Section Skeleton */}
      <div className="space-y-4">
        {/* Title Skeleton */}
        <Skeleton height="h-10" width="w-2/3" />

        {/* Breadcrumb Skeleton */}
        <Skeleton height="h-5" width="w-1/3" />

        {/* Stats Skeleton */}
        <div className="flex gap-4">
          <Skeleton height="h-12" width="w-40" />
          <Skeleton height="h-12" width="w-40" />
        </div>

        {/* Description Skeleton */}
        <div className="space-y-2">
          <Skeleton height="h-4" />
          <Skeleton height="h-4" width="w-5/6" />
          <Skeleton height="h-4" width="w-4/5" />
        </div>

        {/* Info Section Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2 p-4 bg-slate-100 rounded-lg">
              <Skeleton height="h-4" width="w-20" />
              <Skeleton height="h-6" width="w-24" />
            </div>
          ))}
        </div>

        {/* Highlights Skeleton */}
        <div className="space-y-4 mt-8">
          <Skeleton height="h-8" width="w-40" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 border border-slate-200 rounded-lg space-y-2">
                <Skeleton height="h-6" width="w-32" />
                <Skeleton height="h-4" />
                <Skeleton height="h-4" width="w-4/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export { Skeleton, DestinationDetailSkeleton };
