const MAX_HEDGE = parseInt(process.env.MAX_HEDGE_CONCURRENCY ?? '2');

let activeHedgedRequests = 0;

export function canHedge(): boolean {
  return activeHedgedRequests < MAX_HEDGE;
}

export function acquireHedgeSlot(): (() => void) | null {
  if (activeHedgedRequests >= MAX_HEDGE) return null;
  activeHedgedRequests++;
  return () => {
    activeHedgedRequests = Math.max(0, activeHedgedRequests - 1);
  };
}

export function getMaxHedgeConcurrency(): number {
  return MAX_HEDGE;
}
