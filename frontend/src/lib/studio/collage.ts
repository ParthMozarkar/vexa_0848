
export interface GarmentItem {
  id: string;
  url: string;
  category: string;
}

/**
 * Optimized client-side collage creation.
 * Merges multiple garments into a single image to optimize AI processing.
 */
export async function createOutfitCollage(items: GarmentItem[]): Promise<string> {
  if (items.length <= 1) return items[0]?.url || '';
  
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');
    if (!ctx) return resolve(items[0].url);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 768, 768);

    let loaded = 0;
    const positions = [
      { x: 0, y: 0, w: 384, h: 384 },
      { x: 384, y: 0, w: 384, h: 384 },
      { x: 0, y: 384, w: 384, h: 384 },
      { x: 384, y: 384, w: 384, h: 384 },
    ];

    items.forEach((item, index) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const pos = positions[index % 4];
        const scale = Math.min(pos.w / img.width, pos.h / img.height) * 0.9;
        const w = img.width * scale;
        const h = img.height * scale;
        const dx = pos.x + (pos.w - w) / 2;
        const dy = pos.y + (pos.h - h) / 2;
        ctx.drawImage(img, dx, dy, w, h);
        
        loaded++;
        if (loaded === items.length) {
          resolve(canvas.toDataURL('image/png', 0.8));
        }
      };
      img.onerror = () => {
        loaded++;
        if (loaded === items.length) resolve(canvas.toDataURL('image/png', 0.8));
      };
      img.src = item.url;
    });
  });
}
