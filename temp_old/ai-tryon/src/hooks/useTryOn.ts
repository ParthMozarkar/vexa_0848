'use client'
import { useTryOnStore } from '@/store/tryOnStore'
import type { Product } from '@/types'

export function useTryOn() {
  const { results, selectedProduct, isProcessing, setResult, setSelectedProduct, setProcessing } = useTryOnStore()

  async function triggerTryOn(product: Product, userId: string) {
    setProcessing(true)
    setSelectedProduct(product)
    try {
      const res = await fetch('/api/tryon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          productId: product.id,
          userPhotoUrl: product.image_url, // Instructions say "userPhotoUrl: product.imageUrl // will be overridden" 
                                           // but product image_url is standard.
                                           // Actually, triggerTryOn should likely use a separate user photo.
                                           // For now, following user's prompt logic.
          productImageUrl: product.image_url, 
          category: product.category,
        }),
      })
      const data = await res.json()
      setResult(product.id, { 
        id: data.jobId || Math.random().toString(),
        status: data.status,
        productId: product.id,
        result_url: data.resultUrl,
      })
    } catch (err) {
      console.error('triggerTryOn error:', err);
      setResult(product.id, { id: '', status: 'error', productId: product.id })
    } finally {
      setProcessing(false)
    }
  }

  async function triggerBatch(products: Product[], userId: string) {
    setProcessing(true)
    try {
      const res = await fetch('/api/tryon/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productIds: products.map(p => p.id), products }),
      })
      
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) {
        setProcessing(false);
        return;
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data:'))
        
        for (const line of lines) {
          const payload = line.slice(5).trim()
          if (payload === '[DONE]') { 
            setProcessing(false); 
            return;
          }
          try {
            const result = JSON.parse(payload)
            setResult(result.productId, result)
          } catch (parseErr) {
            console.error('SSE parse error:', parseErr)
          }
        }
      }
    } catch (err) {
      console.error('triggerBatch error:', err)
    } finally {
      setProcessing(false)
    }
  }

  return { results, selectedProduct, isProcessing, triggerTryOn, triggerBatch, setSelectedProduct }
}
