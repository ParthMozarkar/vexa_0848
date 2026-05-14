import dynamic from 'next/dynamic';

// Heavy 3D components — loaded only when needed.
// Named-export modules are wrapped with .then(m => ({ default: m.X }))
// so next/dynamic receives a proper default-export loader.

export const AvatarViewerDynamic = dynamic(
  () => import('@/components/AvatarViewer').then((m) => ({ default: m.AvatarViewer })),
  {
    ssr: false,
    loading: () => null,
  }
);

export const ARTryOnDynamic = dynamic(
  () => import('@/components/ARTryOn').then((m) => ({ default: m.ARTryOn })),
  {
    ssr: false,
    loading: () => null,
  }
);

export const VideoTryOnDynamic = dynamic(
  () => import('@/components/VideoTryOn').then((m) => ({ default: m.VideoTryOn })),
  {
    ssr: false,
    loading: () => null,
  }
);

// Spline — heavy marketing 3D, defer on mobile
export const SplineDynamic = dynamic(
  () => import('@splinetool/react-spline'),
  {
    ssr: false,
    loading: () => null,
  }
);
