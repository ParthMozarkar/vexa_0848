'use client';
import React, { useState, useCallback } from 'react';
import {
  MEASUREMENT_FIELDS_CM,
  validateMeasurements,
  convertMeasurements,
  estimateClothingSize,
  type MeasurementValidationError,
} from '@/lib/measurementUtils';
import { Ruler, Info } from 'lucide-react';

interface MeasurementFormProps {
  onSubmit: (measurements: any) => void;
  isLoading?: boolean;
}

const EMPTY_FORM: Record<string, string> = {
  heightCm: '',
  weightKg: '',
  chestCm: '',
  waistCm: '',
  hipsCm: '',
  inseamCm: '',
  shoulderWidthCm: '',
};

export const MeasurementForm = ({ onSubmit, isLoading = false }: MeasurementFormProps) => {
  const [unit, setUnit] = useState<'cm' | 'inch'>('cm');
  const [formValues, setFormValues] = useState<Record<string, string>>(EMPTY_FORM);
  const [errors, setErrors] = useState<MeasurementValidationError[]>([]);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  const getFieldError = (key: string): string | undefined =>
    errors.find((e) => e.field === key)?.message;

  const handleChange = useCallback((key: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => new Set(prev).add(key));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = {
      height: parseFloat(formValues.heightCm) || 0,
      weight: parseFloat(formValues.weightKg) || 0,
      chest: parseFloat(formValues.chestCm) || 0,
      waist: parseFloat(formValues.waistCm) || 0,
      hips: parseFloat(formValues.hipsCm) || 0,
      inseam: parseFloat(formValues.inseamCm) || 0,
      shoulder_width: parseFloat(formValues.shoulderWidthCm) || 0,
    };

    const inCm = unit === 'inch' ? convertMeasurements(parsed, 'inch', 'cm') : parsed;
    const validationErrors = validateMeasurements(inCm);

    setErrors(validationErrors);
    setTouched(new Set(MEASUREMENT_FIELDS_CM.map((f) => f.key)));

    if (validationErrors.length === 0) {
      onSubmit(inCm);
    }
  };

  const chestVal = parseFloat(formValues.chestCm);
  const estimatedSize = !isNaN(chestVal) && chestVal > 0
    ? estimateClothingSize(unit === 'inch' ? chestVal * 2.54 : chestVal)
    : null;

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Ruler className="w-5 h-5 text-[#bef264]" />
          <span className="text-white font-semibold text-lg">Body Geometry</span>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
          {['cm', 'inch'].map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u as any)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                unit === u ? 'bg-[#bef264] text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {estimatedSize && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#bef264]/10 border border-[#bef264]/20 animate-in fade-in slide-in-from-top-1">
          <span className="text-sm text-white/70">Algorithm estimates your size as</span>
          <span className="text-[#bef264] font-bold text-sm tracking-wider">{estimatedSize}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MEASUREMENT_FIELDS_CM.map((field) => {
          const fieldError = touched.has(field.key) ? getFieldError(field.key) : undefined;
          return (
            <div key={field.key} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 mb-0.5">
                <label className="text-sm font-medium text-white/40 uppercase tracking-widest text-[10px]">
                  {field.label} ({field.key === 'weightKg' ? 'kg' : unit})
                </label>
                <div className="group relative">
                  <Info className="w-3 h-3 text-white/20 cursor-help" />
                  <div className="absolute left-0 bottom-full mb-2 w-48 p-3 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white/60 opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none shadow-2xl">
                    {field.helpText}
                  </div>
                </div>
              </div>
              <input
                type="number"
                step="0.1"
                placeholder={field.placeholder}
                value={formValues[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                className={`w-full h-12 px-4 rounded-xl bg-white/5 border text-white transition-all ${
                  fieldError ? 'border-red-500/50 focus:ring-red-500/20' : 'border-white/10 focus:border-[#bef264]/40 focus:ring-2 focus:ring-[#bef264]/10'
                }`}
              />
              {fieldError && <p className="text-[10px] text-red-400 font-bold uppercase tracking-tighter mt-1">{fieldError}</p>}
            </div>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-14 bg-[#bef264] text-black font-bold uppercase tracking-widest rounded-xl hover:bg-[#a3e635] shadow-[0_10px_30px_rgba(190,242,100,0.2)] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
      >
        {isLoading ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : 'Activate Synthetic Duplicate'}
      </button>
    </form>
  );
};
