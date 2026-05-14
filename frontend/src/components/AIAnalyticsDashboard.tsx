
import React, { useMemo } from 'react';
import { SmartRouter } from '@/lib/orchestration/SmartRouter';
import { ProviderMetrics } from '@/lib/orchestration/types';

const MetricCard = ({ title, value, unit, trend }: { title: string, value: string | number, unit?: string, trend?: 'up' | 'down' | 'neutral' }) => (
  <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl backdrop-blur-sm">
    <div className="text-zinc-400 text-sm font-medium mb-1">{title}</div>
    <div className="flex items-end gap-2">
      <div className="text-2xl font-bold text-white">{value}{unit}</div>
      {trend && (
        <div className={`text-xs pb-1 font-medium ${
          trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-zinc-500'
        }`}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '•'}
        </div>
      )}
    </div>
  </div>
);

export const AIAnalyticsDashboard: React.FC = () => {
  const metrics = SmartRouter.getAllMetrics();
  
  const totals = useMemo(() => {
    if (metrics.length === 0) return null;
    const successRate = metrics.reduce((acc, m) => acc + m.successRate, 0) / metrics.length;
    const avgLatency = metrics.reduce((acc, m) => acc + m.avgLatencyMs, 0) / metrics.length;
    const totalErrors = metrics.reduce((acc, m) => acc + m.errorCount, 0);
    return { successRate, avgLatency, totalErrors };
  }, [metrics]);

  if (!totals) {
    return (
      <div className="p-8 text-center text-zinc-500 border border-zinc-800 rounded-2xl bg-zinc-950">
        No orchestration metrics recorded yet. Start a generation to see real-time benchmarks.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard 
          title="Overall Success Rate" 
          value={(totals.successRate * 100).toFixed(1)} 
          unit="%" 
          trend="up" 
        />
        <MetricCard 
          title="Avg Orchestration Latency" 
          value={(totals.avgLatency / 1000).toFixed(2)} 
          unit="s" 
          trend="down" 
        />
        <MetricCard 
          title="Total Provider Failures" 
          value={totals.totalErrors} 
          trend="neutral" 
        />
      </div>

      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-zinc-800/50 text-zinc-400 text-xs font-medium uppercase tracking-wider">
              <th className="px-6 py-3">Provider</th>
              <th className="px-6 py-3">Reliability</th>
              <th className="px-6 py-3">Avg Latency</th>
              <th className="px-6 py-3">Quality Score</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {metrics.map((m) => (
              <tr key={m.providerId} className="text-sm hover:bg-zinc-800/20 transition-colors">
                <td className="px-6 py-4 font-medium text-white">{m.providerId}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full" 
                        style={{ width: `${m.successRate * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-400">{(m.successRate * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-zinc-300">{(m.avgLatencyMs / 1000).toFixed(2)}s</td>
                <td className="px-6 py-4 text-zinc-300">{m.qualityScore.toFixed(1)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    m.successRate > 0.9 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {m.successRate > 0.9 ? 'Optimal' : 'Degraded'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
