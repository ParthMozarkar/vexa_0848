import { NextRequest, NextResponse } from 'next/server';
import { computeFitLabel } from '@/lib/measurementUtils';
import type { Measurements, SizeChart, FitResult } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { measurements, sizeChart } = body as {
      measurements: Measurements;
      sizeChart: SizeChart[];
    };

    if (!measurements || !sizeChart || sizeChart.length === 0) {
      return NextResponse.json({ error: 'Missing measurements or sizeChart' }, { status: 400 });
    }

    // Find the best fitting size (the one where all delta are >= -2 and total delta is minimized)
    let bestSize: SizeChart | null = null;
    let minDelta = Infinity;

    for (const entry of sizeChart) {
      const chestFit = computeFitLabel(measurements.chest, entry.chest_cm);
      const waistFit = computeFitLabel(measurements.waist, entry.waist_cm);
      const hipsFit = computeFitLabel(measurements.hips, entry.hips_cm);

      // Skip sizes where it's too tight in any critical area
      if (chestFit === 'too_tight' || waistFit === 'too_tight' || hipsFit === 'too_tight') {
        continue;
      }

      const totalDelta = (entry.chest_cm - measurements.chest) + 
                         (entry.waist_cm - measurements.waist) + 
                         (entry.hips_cm - measurements.hips);
      
      if (totalDelta < minDelta) {
        minDelta = totalDelta;
        bestSize = entry;
      }
    }

    // Fallback to the largest size if everything is too tight
    if (!bestSize) {
      bestSize = sizeChart[sizeChart.length - 1];
    }

    const result: FitResult = {
      product_id: bestSize.product_id,
      recommended_size: bestSize.size,
      fit_label: computeFitLabel(measurements.chest, bestSize.chest_cm),
      chest_delta_cm: bestSize.chest_cm - measurements.chest,
      waist_delta_cm: bestSize.waist_cm - measurements.waist,
      hips_delta_cm: bestSize.hips_cm - measurements.hips,
    };

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Size calculation error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
