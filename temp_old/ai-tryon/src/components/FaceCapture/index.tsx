'use client';
import React, { useCallback, useState } from "react";
import { UploadCloud, CheckCircle2, RefreshCw, Loader2 } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useStore } from "@/store/useStore";

const PLACEHOLDER_MODEL = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80";

export const FaceCapture = ({ onCapture, onClear }: { onCapture: (file: File) => void, onClear: () => void }) => {
  const { userImage, setUserImage, setTryOnResult } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);
  const backgroundX = useTransform(mouseXSpring, [-0.5, 0.5], ["-3%", "3%"]);
  const backgroundY = useTransform(mouseYSpring, [-0.5, 0.5], ["-3%", "3%"]);
  const foregroundX = useTransform(mouseXSpring, [-0.5, 0.5], ["3%", "-3%"]);
  const foregroundY = useTransform(mouseYSpring, [-0.5, 0.5], ["3%", "-3%"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const normalizedX = (e.clientX - rect.left) / rect.width - 0.5;
    const normalizedY = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(normalizedX);
    y.set(normalizedY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const currentImage = userImage || PLACEHOLDER_MODEL;

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    
    // 1. Local preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setUserImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // 2. Trigger capture
    onCapture(file);
    
  }, [setUserImage, onCapture]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  return (
    <div className="w-full flex flex-col gap-4">
      <div 
        className="relative w-full aspect-[3/4] sm:h-[450px] perspective-[1000px] group cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
        }}
      >
        <input 
          type="file" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50" 
          accept="image/*"
          onChange={handleFileChange}
        />
        
        <motion.div
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            className="w-full h-full relative glass-panel border border-[#bef264]/20 rounded-2xl overflow-hidden shadow-2xl transition-shadow duration-300 hover:shadow-[0_40px_80px_rgba(190,242,100,0.1)]"
        >
          <motion.div style={{ x: backgroundX, y: backgroundY }} className="absolute inset-[-10%] w-[120%] h-[120%] z-0">
            <img src={currentImage} className="w-full h-full object-cover blur-2xl opacity-40 scale-110" />
          </motion.div>

          <motion.div style={{ x: foregroundX, y: foregroundY }} className="absolute inset-0 w-full h-full z-10 transition-transform duration-700 ease-out group-hover:scale-[1.02]">
            <img src={currentImage} className="w-full h-full object-cover" />
          </motion.div>

          <div className="absolute inset-0 z-40 p-6 flex flex-col justify-end pointer-events-none text-center">
            {!userImage ? (
              <div className="flex flex-col items-center gap-4 mt-auto mb-auto bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 mx-4 pointer-events-auto">
                <div className="w-16 h-16 rounded-full bg-[#bef264] flex items-center justify-center shadow-[0_0_30px_rgba(190,242,100,0.5)]">
                  <UploadCloud className="w-8 h-8 text-black" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1 tracking-tight">Step into the Studio</h3>
                  <p className="text-white/60 text-sm">Upload a portrait to begin 3D reconstruction</p>
                </div>
              </div>
            ) : (
                <div className="flex items-center justify-between pointer-events-auto">
                   <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                      <CheckCircle2 className="w-4 h-4 text-[#bef264]" />
                      <span className="text-sm font-semibold text-white">Identity Confirmed</span>
                   </div>
                   <button onClick={(e) => { e.stopPropagation(); onClear(); setUserImage(null); }} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
                      <RefreshCw className="w-4 h-4" />
                   </button>
                </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
