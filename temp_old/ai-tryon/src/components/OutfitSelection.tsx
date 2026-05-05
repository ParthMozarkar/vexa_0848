'use client';
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { useAuth } from "@/hooks/useAuth";
import type { Product } from "@/types";
import { Check, Sparkles, Loader2 } from "lucide-react";

const PRODUCTS: Product[] = [
  { id: "p1", name: "Cyberpunk Tech Hoodie", price: 159, imageUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=800&fit=crop", category: "outerwear" },
  { id: "p2", name: "Neural Silk Blouse", price: 89, imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop", category: "tops" },
  { id: "p3", name: "Glitch Denim Jacket", price: 199, imageUrl: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&h=800&fit=crop", category: "outerwear" },
  { id: "p4", name: "Vector Cargo Pants", price: 120, imageUrl: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600&h=800&fit=crop", category: "bottoms" },
  { id: "p5", name: "Pixel Weave Scarf", price: 45, imageUrl: "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=600&h=800&fit=crop", category: "accessories" },
  { id: "p6", name: "Binary Evening Dress", price: 299, imageUrl: "https://images.unsplash.com/photo-1550639525-c97d455acf70?w=600&h=800&fit=crop", category: "dresses" },
];

export const OutfitSelection = () => {
  const { selectedOutfit, setSelectedOutfit, userImage, tryOnResult } = useStore();
  const { user } = useAuth();
  const [batchResults, setBatchResults] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const hasImage = !!userImage;

  useEffect(() => {
    if (user?.id && userImage) {
      // In a real app, we'd trigger the /api/tryon/batch SSE stream here
      // For the demo studio, we'll simulate or just allow selection
    }
  }, [user, userImage]);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${hasImage ? 'bg-[#bef264]' : 'bg-white/10'}`}>
            <span className={`text-sm font-bold ${hasImage ? 'text-black' : 'text-white/20'}`}>2</span>
          </div>
          <h2 className={`text-xl font-bold tracking-tight ${hasImage ? 'text-white' : 'text-white/30'}`}>Select Garment</h2>
        </div>
        {hasImage && (
            <div className="px-3 py-1 rounded-full bg-[#bef264]/10 border border-[#bef264]/20 text-[#bef264] text-[10px] font-bold uppercase tracking-widest animate-pulse">
                Neural Match Ready
            </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {PRODUCTS.map((product) => {
          const isSelected = selectedOutfit?.id === product.id;
          return (
            <motion.div
              key={product.id}
              whileHover={hasImage ? { y: -5 } : {}}
              onClick={() => hasImage && setSelectedOutfit(product as any)}
              className={`relative aspect-[3/4] rounded-2xl overflow-hidden glass-panel border transition-all cursor-pointer ${
                !hasImage ? 'opacity-30 cursor-not-allowed' : isSelected ? 'border-[#bef264] shadow-[0_0_30px_rgba(190,242,100,0.2)]' : 'border-white/5 hover:border-white/20'
              }`}
            >
              <img src={product.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
              
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-[#bef264] rounded-full flex items-center justify-center shadow-lg animate-in zoom-in-50">
                  <Check className="w-3.5 h-3.5 text-black" />
                </div>
              )}

              <div className="absolute bottom-4 left-4 right-4">
                 <p className="text-[10px] font-bold text-[#bef264]/60 uppercase tracking-widest mb-1">{product.category}</p>
                 <h3 className="text-white text-sm font-bold truncate leading-none">{product.name}</h3>
                 <p className="text-white/40 text-[10px] mt-1.5">${product.price}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
