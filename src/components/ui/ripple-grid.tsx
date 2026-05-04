"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

function useIsClient() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);
  return isClient;
}

export interface RippleGridProps {
  /** Fixed N×N grid (ignored when `fillViewport` is true) */
  size?: number;
  filledCells?: Array<{ row: number; col: number }>;
  /** Tile the viewport with square cells (even spread edge-to-edge) */
  fillViewport?: boolean;
  /**
   * Accent cells as fractions of grid (0–1), e.g. [0.1, 0.1] = near top-left.
   * Only used when `fillViewport` is true (recomputed on resize).
   */
  accentFractions?: Array<{ fr: number; fc: number }>;
  cellSize?: number;
  cellColor?: string;
  filledCellColor?: string;
  pulseColor?: string;
  borderColor?: string;
  borderWidth?: number;
  pulseScale?: number;
  pulseDuration?: number;
  rippleDelay?: number;
  className?: string;
  /**
   * When true, any click on the page (capture phase) maps to the nearest cell
   * and runs the ripple without blocking the real target. Inner cells use
   * `pointer-events: none` so buttons and links stay fully interactive.
   */
  reactToGlobalClicks?: boolean;
}

export function RippleGrid({
  size = 5,
  filledCells = [],
  fillViewport = false,
  accentFractions = [],
  cellSize = 50,
  cellColor = "#fff",
  filledCellColor = "#000",
  pulseColor = "#76cefa",
  borderColor = "#000",
  borderWidth = 1,
  pulseScale = 1.1,
  pulseDuration = 300,
  rippleDelay = 100,
  className,
  reactToGlobalClicks = false,
}: RippleGridProps) {
  const isClient = useIsClient();
  const gridRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, "");
  const safeId = uid.replace(/[^a-zA-Z0-9_-]/g, "x");
  const cellClass = `ripple-cell-${safeId}`;
  const keyName = `ripplePulse_${safeId}`;

  // Start with 0 dims when fillViewport — avoids SSR/client hydration mismatch
  // (SSR can't know window size; React 19 will tear down the tree on mismatch)
  const [dims, setDims] = useState(() => fillViewport ? { cols: 0, rows: 0 } : { cols: size, rows: size });

  useEffect(() => {
    if (!fillViewport) {
      setDims({ cols: size, rows: size });
      return;
    }

    const measure = () => {
      const w = typeof window !== "undefined" ? window.innerWidth : 1200;
      const h = typeof window !== "undefined" ? window.innerHeight : 800;
      const cols = Math.max(8, Math.ceil(w / cellSize) + 1);
      const rows = Math.max(8, Math.ceil(h / cellSize) + 1);
      setDims({ cols, rows });
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [fillViewport, size, cellSize]);

  const cols = dims.cols;
  const rows = dims.rows;

  useEffect(() => {
    const gridContainer = gridRef.current;
    if (!gridContainer) return;

    const runRipple = (clickedRow: number, clickedCol: number) => {
      const cells = gridContainer.querySelectorAll(`.${cellClass}`);

      cells.forEach((cell) => {
        const htmlCell = cell as HTMLElement;
        const row = Number.parseInt(htmlCell.dataset.row || "0", 10);
        const col = Number.parseInt(htmlCell.dataset.col || "0", 10);

        const distance = Math.abs(row - clickedRow) + Math.abs(col - clickedCol);

        window.setTimeout(() => {
          htmlCell.classList.add("pulse");

          window.setTimeout(() => {
            htmlCell.classList.remove("pulse");
          }, pulseDuration + 200);
        }, distance * rippleDelay);
      });
    };

    if (reactToGlobalClicks) {
      const onDocumentClick = (event: MouseEvent) => {
        const rect = gridContainer.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

        const clickedCol = Math.min(cols - 1, Math.max(0, Math.floor(x / cellSize)));
        const clickedRow = Math.min(rows - 1, Math.max(0, Math.floor(y / cellSize)));
        runRipple(clickedRow, clickedCol);
      };

      document.addEventListener("click", onDocumentClick, true);
      return () => document.removeEventListener("click", onDocumentClick, true);
    }

    const handleGridClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.classList.contains(cellClass)) return;

      const clickedRow = Number.parseInt(target.dataset.row || "0", 10);
      const clickedCol = Number.parseInt(target.dataset.col || "0", 10);
      runRipple(clickedRow, clickedCol);
    };

    gridContainer.addEventListener("click", handleGridClick);

    return () => {
      gridContainer.removeEventListener("click", handleGridClick);
    };
  }, [
    reactToGlobalClicks,
    pulseDuration,
    rippleDelay,
    cols,
    rows,
    cellClass,
    cellSize,
  ]);

  const isFilled = (row: number, col: number) => {
    if (fillViewport && accentFractions.length > 0) {
      const maxR = Math.max(0, rows - 1);
      const maxC = Math.max(0, cols - 1);
      return accentFractions.some(({ fr, fc }) => {
        const tr = Math.round(Math.min(1, Math.max(0, fr)) * maxR);
        const tc = Math.round(Math.min(1, Math.max(0, fc)) * maxC);
        return tr === row && tc === col;
      });
    }
    return filledCells.some((cell) => cell.row === row && cell.col === col);
  };

  const cells: ReactNode[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push(
        <div
          key={`${row}-${col}-${cols}-${rows}`}
          className={cn(cellClass, isFilled(row, col) ? "filled" : "")}
          data-row={row}
          data-col={col}
        />,
      );
    }
  }

  const css = `
.${cellClass} {
  width: ${cellSize}px;
  height: ${cellSize}px;
  background-color: ${cellColor};
  border: ${borderWidth}px solid ${borderColor};
  box-sizing: border-box;
  cursor: pointer;
}
.${cellClass}.filled {
  background-color: ${filledCellColor};
}
.${cellClass}.pulse:not(.filled) {
  animation: ${keyName} ${pulseDuration}ms forwards;
}
@keyframes ${keyName} {
  0% {
    background-color: ${cellColor};
    transform: scale(1);
  }
  50% {
    background-color: ${pulseColor};
    transform: scale(${pulseScale});
  }
  100% {
    background-color: ${cellColor};
    transform: scale(1);
  }
}
`;

  // Don't render the grid at all on the server when fillViewport — no window to measure
  if (fillViewport && !isClient) return null;

  return (
    <div
      className={cn(
        "pointer-events-none",
        fillViewport
          ? "fixed inset-0 z-0 flex items-start justify-start overflow-hidden"
          : "flex items-center justify-center",
        className,
      )}
    >
      <div
        ref={gridRef}
        className={cn(
          "grid shrink-0 gap-0",
          reactToGlobalClicks ? "pointer-events-none" : "pointer-events-auto",
        )}
        style={{
          width: cols * cellSize,
          height: rows * cellSize,
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
        }}
      >
        {cells}
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </div>
    </div>
  );
}
