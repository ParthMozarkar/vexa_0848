# vexa-sdk

VEXA AI Virtual Try-On Software Development Kit for React Native / Expo.

## Installation

```bash
npm install vexa-sdk
npx expo install expo-camera expo-image-picker
```

## Quick start

```tsx
import { VexaTryOn } from 'vexa-sdk'

export default function ProductScreen({ user, product }) {
  return (
    <VexaTryOn
      apiKey="vx_live_myntra_key"
      apiBaseUrl="https://your-vexa-app.vercel.app"
      productId={product.id}
      productImageUrl={product.imageUrl}
      userId={user.id}
    />
  )
}
```

## Hooks-only usage

```tsx
import { useTryOn, useAvatar } from 'vexa-sdk'

const config = { apiKey: 'vx_live_...', apiBaseUrl: 'https://...' }

const { triggerTryOn, tryOnResult, status } = useTryOn(config)
const { generateAvatar, avatarUrl, status: avatarStatus } = useAvatar(config)
```

## Props

### `<VexaTryOn />`

| Prop | Type | Required | Description |
|---|---|---|---|
| `apiKey` | `string` | ✓ | VEXA API key (x-vexa-key header) |
| `apiBaseUrl` | `string` | ✓ | Base URL of your deployed VEXA app |
| `productId` | `string` | ✓ | Unique product identifier |
| `productImageUrl` | `string` | ✓ | Public URL of the product image |
| `userId` | `string` | ✓ | Authenticated user UUID |

## Authentication

All requests include an `x-vexa-key` header. Generate keys from your VEXA dashboard (`/dashboard`).
