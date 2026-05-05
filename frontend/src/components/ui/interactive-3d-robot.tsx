"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import type { SplineProps } from "@splinetool/react-spline-bundle";

import { cn } from "@/lib/utils";

const Spline = dynamic<SplineProps>(() => import("@splinetool/react-spline-bundle").then((mod) => mod.default), {
  ssr: false,
});

export interface InteractiveRobotSplineProps {
  scene: string;
  className?: string;
  onLoad?: SplineProps["onLoad"];
}

function SplineFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full min-h-[200px] w-full items-center justify-center bg-muted text-muted-foreground",
        className,
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
      <span className="sr-only">Loading 3D scene</span>
    </div>
  );
}

export function InteractiveRobotSpline({ scene, className, onLoad }: InteractiveRobotSplineProps) {
  return (
    <Suspense fallback={<SplineFallback className={className} />}>
      <Spline scene={scene} className={className} onLoad={onLoad} />
    </Suspense>
  );
}
