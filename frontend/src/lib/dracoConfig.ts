// Draco compression decoder configuration
// Must be called before any useGLTF() calls to enable Draco-compressed GLB support
// Install: npm install three (already installed)

export function configureDracoDecoder(): void {
  if (typeof window === 'undefined') return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DRACOLoader } = require('three/examples/jsm/loaders/DRACOLoader') as {
      DRACOLoader: new () => { setDecoderPath(path: string): void };
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader') as {
      GLTFLoader: new () => { setDRACOLoader(loader: unknown): void };
    };
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);
  } catch {
    // Three.js DRACOLoader not available — Draco compression disabled
  }
}
