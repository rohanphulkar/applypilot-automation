import React from "react";

export function LoadingSkeleton({ count = 3, type = "card" }) {
  if (type === "table") {
    return (
      <div className="w-full space-y-3 animate-pulse">
        <div className="h-12 bg-[#e5e5e5] dark:bg-[#202f37] rounded-2xl w-full" />
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="h-16 bg-white dark:bg-[#1b2b32] border-2 border-[#e5e5e5] dark:border-[#2e414c] rounded-2xl w-full"
          />
        ))}
      </div>
    );
  }

  if (type === "stepper") {
    return (
      <div className="w-full space-y-4 animate-pulse">
        <div className="h-4 bg-[#e5e5e5] dark:bg-[#202f37] rounded-full w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-white dark:bg-[#1b2b32] border-2 border-[#e5e5e5] dark:border-[#2e414c] rounded-2xl"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-32 duo-card p-5"
        />
      ))}
    </div>
  );
}

export default LoadingSkeleton;
