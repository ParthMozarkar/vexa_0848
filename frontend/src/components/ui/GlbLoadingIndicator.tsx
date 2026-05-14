'use client';

interface GlbLoadingIndicatorProps {
  progress: number;
  message?: string;
}

export function GlbLoadingIndicator({ progress, message = 'Loading 3D model...' }: GlbLoadingIndicatorProps) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[200px] gap-3">
      <div className="w-48 h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-white rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">{message}</p>
    </div>
  );
}
