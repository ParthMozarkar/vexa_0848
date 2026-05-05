export type Product = {
  id: string
  name: string
  brand: string
  image_url: string
  clothing_image_url: string
  price: number
  sizes: string[]
  category: string
}

export type SizeChart = {
  product_id: string
  size: string
  chest_cm: number
  waist_cm: number
  hips_cm: number
  length_cm: number
}

// Legacy shape used by existing MVP components
export type Outfit = {
  id: string
  name: string
  price: number
  imageUrl: string
  category: string
}
