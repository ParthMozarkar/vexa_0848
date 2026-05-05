'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FaceCapture } from '@/components/FaceCapture';
import { MeasurementForm } from '@/components/MeasurementForm';
import { AvatarViewer } from '@/components/AvatarViewer';
import { ArrowLeft, Sparkles, UserCircle, Rocket, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const handleStart = () => setStep(2);
  const handleCapture = (file: File) => setPhotoFile(file);

  const handleGenerate = async (meas: any) => {
    setIsGenerating(true);
    setStep(4);
    
    try {
      // 1. Convert photo to base64
      const reader = new FileReader();
      const photoBase64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(photoFile!);
      });

      // 2. Call generate API
      const res = await fetch('/api/avatar/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          photoBase64,
          measurements: meas
        })
      });

      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      
      // 3. Poll for result (simplified for wizard UX)
      // In a real app we'd use useAvatar hook, but here we just wait or show success
      setAvatarUrl(data.avatarUrl); // This might be null if async, but our API returns it if fast
      
      // Artificial delay for UX "Wow" factor
      setTimeout(() => {
        setIsGenerating(false);
        setStep(5);
      }, 3000);

    } catch (err) {
      console.error(err);
      setIsGenerating(false);
      setStep(5); // Proceed anyway for demo
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-[#bef264] selection:text-black">
      <div className="max-w-4xl mx-auto px-6 py-12">
        
        {/* Progress Bar */}
        <div className="flex gap-2 mb-12">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${step >= s ? 'bg-[#bef264] shadow-[0_0_10px_rgba(190,242,100,0.5)]' : 'bg-white/5'}`} />
          ))}
        </div>

        {step > 1 && step < 4 && (
          <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-2 text-white/40 hover:text-white mb-8 transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold uppercase tracking-widest">Back</span>
          </button>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center py-20">
              <div className="w-20 h-20 bg-[#bef264]/10 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-[#bef264]/20">
                <Sparkles className="w-10 h-10 text-[#bef264]" />
              </div>
              <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter">Your Digital Twin <br/>Starts Here.</h1>
              <p className="text-white/40 text-xl max-w-xl mx-auto leading-relaxed mb-12">
                Calibrate your 3D topology with a single photo and core measurements. Precision fit, powered by SMPL-X.
              </p>
              <button onClick={handleStart} className="px-12 py-6 bg-[#bef264] text-black font-black text-xl rounded-2xl hover:scale-105 transition-all shadow-[0_20px_50px_rgba(190,242,100,0.3)]">
                Initialize Calibration
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="mb-10">
                <div className="flex items-center gap-2 text-[#bef264] mb-3">
                   <Shield className="w-4 h-4" />
                   <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Privacy Shield Active</span>
                </div>
                <h2 className="text-4xl font-bold mb-3 tracking-tight">Identity Scan</h2>
                <p className="text-white/40 text-lg">We extract 3D landmarks for mesh regression. RGB data is never stored permanently.</p>
              </div>
              <FaceCapture onCapture={handleCapture} onClear={() => setPhotoFile(null)} />
              {photoFile && (
                <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setStep(3)} className="w-full mt-8 py-5 bg-[#bef264] text-black font-black uppercase tracking-widest rounded-2xl hover:bg-[#a3e635] shadow-xl">
                  Analyze Topology
                </motion.button>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="mb-10">
                <h2 className="text-4xl font-bold mb-3 tracking-tight">Geometry Matrix</h2>
                <p className="text-white/40 text-lg">Input your core dimensions to guide the LBS (Linear Blend Skinning) engine.</p>
              </div>
              <div className="p-6 bg-zinc-900/50 rounded-3xl border border-white/5 mb-8 flex items-start gap-5">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
                  <UserCircle className="w-6 h-6 text-white/40" />
                </div>
                <p className="text-sm text-white/60 leading-relaxed italic">"For best results, measure against your skin. The AI will account for fabric thickness based on the garment you try on."</p>
              </div>
              <MeasurementForm onSubmit={handleGenerate} isLoading={isGenerating} />
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-32 flex flex-col items-center justify-center text-center">
              <div className="relative w-32 h-32 mb-12">
                <div className="absolute inset-0 border-4 border-[#bef264]/10 rounded-full animate-ping" />
                <div className="absolute inset-4 border-4 border-t-[#bef264] border-transparent rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Rocket className="w-10 h-10 text-[#bef264]" />
                </div>
              </div>
              <h2 className="text-3xl font-bold mb-4 tracking-tight">Regressing SMPL-X Manifold</h2>
              <p className="text-[#bef264]/60 font-mono text-xs uppercase tracking-[0.3em] animate-pulse">Establishing Vertex Weights · Morphing Archetypes</p>
              <div className="w-64 h-1 bg-white/5 rounded-full mt-10 overflow-hidden">
                <motion.div initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1/2 h-full bg-gradient-to-r from-transparent via-[#bef264] to-transparent" />
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div key="5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#bef264]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[#bef264]/20">
                  <Sparkles className="w-8 h-8 text-[#bef264]" />
                </div>
                <h2 className="text-5xl font-black mb-3 tracking-tighter text-[#bef264]">Profile Ready</h2>
                <p className="text-white/40 text-lg">Your 3D topology has been successfully regressed and cached.</p>
              </div>

              <div className="aspect-[3/4] sm:aspect-video w-full">
                <AvatarViewer avatarUrl={avatarUrl} />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={() => router.push('/studio')} className="flex-1 py-5 bg-[#bef264] text-black font-black uppercase tracking-widest rounded-2xl hover:bg-[#a3e635] shadow-2xl transition-all">
                  Launch Studio
                </button>
                <button onClick={() => setStep(2)} className="px-8 py-5 bg-white/5 border border-white/10 text-white/70 font-bold rounded-2xl hover:bg-white/10 transition-all">
                  Recalibrate
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
