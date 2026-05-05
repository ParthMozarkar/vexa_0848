import type { Measurements, FitLabel } from '@/types'

export function cmToInches(cm: number): number { return cm / 2.54 }
export function inchesToCm(inches: number): number { return inches * 2.54 }

export const MEASUREMENT_FIELDS_CM = [
  { key: 'heightCm', label: 'Height', placeholder: '175', step: '0.1', helpText: 'Your total height from head to toe.' },
  { key: 'weightKg', label: 'Weight', placeholder: '70', step: '0.1', helpText: 'Your body weight in kilograms.' },
  { key: 'chestCm', label: 'Chest', placeholder: '92', step: '0.1', helpText: 'Measure around the fullest part of your chest.' },
  { key: 'waistCm', label: 'Waist', placeholder: '78', step: '0.1', helpText: 'Measure around the narrowest part of your waist.' },
  { key: 'hipsCm', label: 'Hips', placeholder: '96', step: '0.1', helpText: 'Measure around the fullest part of your hips.' },
  { key: 'inseamCm', label: 'Inseam', placeholder: '78', step: '0.1', helpText: 'Inside leg length from crotch to floor.' },
  { key: 'shoulderWidthCm', label: 'Shoulders', placeholder: '42', step: '0.1', helpText: 'Width between the outer edges of your shoulders.' },
] as const;

export type MeasurementValidationError = {
  field: string;
  message: string;
};

export function validateMeasurements(m: Partial<Measurements>): MeasurementValidationError[] {
  const errors: MeasurementValidationError[] = []
  if (!m.height || m.height < 100 || m.height > 250) errors.push({ field: 'heightCm', message: 'Height must be between 100-250cm' })
  if (!m.chest || m.chest < 30 || m.chest > 200) errors.push({ field: 'chestCm', message: 'Chest must be between 30-200cm' })
  if (!m.waist || m.waist < 30 || m.waist > 200) errors.push({ field: 'waistCm', message: 'Waist must be between 30-200cm' })
  if (!m.hips || m.hips < 30 || m.hips > 200) errors.push({ field: 'hipsCm', message: 'Hips must be between 30-200cm' })
  return errors
}

export function convertMeasurements(m: any, from: 'cm' | 'inch', to: 'cm' | 'inch'): any {
  const factor = from === 'cm' && to === 'inch' ? 1 / 2.54 : 2.54;
  const converted = { ...m };
  Object.keys(m).forEach(key => {
    if (key !== 'weightKg' && typeof m[key] === 'number') {
      converted[key] = m[key] * factor;
    }
  });
  return converted;
}

export function estimateClothingSize(chestCm: number): string {
  if (chestCm < 88) return 'XS';
  if (chestCm < 96) return 'S';
  if (chestCm < 104) return 'M';
  if (chestCm < 112) return 'L';
  if (chestCm < 120) return 'XL';
  return 'XXL';
}

/**
 * Standard delta-based fit recommendation.
 * @param userCm - The user's measurement for a specific dimension
 * @param garmentCm - The garment's measurement for the same dimension
 * @returns FitLabel
 */
export function computeFitLabel(userCm: number, garmentCm: number): FitLabel {
  const delta = garmentCm - userCm
  
  // Tighter than -2cm of body measurement is usually 'too_tight'
  if (delta < -2) return 'too_tight'
  
  // More than 5cm of extra room is 'oversized'
  if (delta > 5) return 'oversized'
  
  // In between is 'true_to_size'
  return 'true_to_size'
}
