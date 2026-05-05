'use client';
import React, { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows, Center } from '@react-three/drei';
import type { Group } from 'three';
import { RotateCcw, ZoomIn, ZoomOut, Sun } from 'lucide-react';

class ErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error) { console.error("Avatar Viewer caught error:", error); }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function AvatarModel({ glbUrl }: { glbUrl: string }) {
  const { scene } = useGLTF(glbUrl);
  const ref = useRef<Group>(null);
  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
  });
  return (
    <Center top>
      <primitive ref={ref} object={scene} scale={1} dispose={null} />
    </Center>
  );
}

function PlaceholderAvatar() {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * 0.5; });
  return (
    <group ref={ref}>
      <mesh position={[0, 1.6, 0]}><sphereGeometry args={[0.12, 32, 32]} /><meshStandardMaterial color="#bef264" roughness={0.2} /></mesh>
      <mesh position={[0, 1.0, 0]}><boxGeometry args={[0.3, 0.6, 0.15]} /><meshStandardMaterial color="#bef264" opacity={0.5} transparent /></mesh>
      <mesh position={[0, 0.3, 0]}><boxGeometry args={[0.25, 0.6, 0.1]} /><meshStandardMaterial color="#bef264" opacity={0.3} transparent /></mesh>
    </group>
  );
}

const CanvasLoader = () => (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/20 backdrop-blur-sm z-50">
    <div className="w-12 h-12 border-4 border-[#bef264]/20 border-t-[#bef264] rounded-full animate-spin" />
    <p className="text-[#bef264] text-xs font-bold uppercase tracking-widest animate-pulse">Initializing Mesh...</p>
  </div>
);

export const AvatarViewer = ({ avatarUrl, className = "" }: { avatarUrl?: string | null, className?: string }) => {
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [env, setEnv] = useState<'city' | 'studio' | 'apartment'>('city');

  return (
    <div className={`relative w-full h-full bg-zinc-950/50 rounded-2xl overflow-hidden border border-white/5 ${className}`}>
      <Suspense fallback={<CanvasLoader />}>
        <Canvas camera={{ position: [0, 1.2, 3 * zoom], fov: 45 }} shadows dpr={[1, 2]}>
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
          <Environment preset={env as any} />
          <Suspense fallback={null}>
            {avatarUrl ? (
              <ErrorBoundary fallback={<PlaceholderAvatar />}>
                <AvatarModel key={avatarUrl} glbUrl={avatarUrl} />
              </ErrorBoundary>
            ) : (
              <PlaceholderAvatar />
            )}
          </Suspense>
          <ContactShadows opacity={0.5} scale={10} blur={2} far={10} resolution={256} color="#000000" />
          <OrbitControls 
            autoRotate={isAutoRotate} 
            enablePan={false} 
            minPolarAngle={Math.PI / 4} 
            maxPolarAngle={Math.PI / 1.5} 
            minDistance={1.5} 
            maxDistance={5} 
          />
        </Canvas>
      </Suspense>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 p-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl z-10">
        <button onClick={() => setIsAutoRotate(!isAutoRotate)} className={`p-2 rounded-xl transition-colors ${isAutoRotate ? 'text-[#bef264] bg-[#bef264]/10' : 'text-white/40 hover:text-white'}`}>
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-white/10" />
        <button onClick={() => setZoom(Math.min(zoom + 0.2, 2))} className="p-2 text-white/40 hover:text-white"><ZoomOut className="w-4 h-4" /></button>
        <button onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))} className="p-2 text-white/40 hover:text-white"><ZoomIn className="w-4 h-4" /></button>
        <div className="w-px h-4 bg-white/10" />
        <button onClick={() => setEnv(e => e === 'city' ? 'studio' : e === 'studio' ? 'apartment' : 'city')} className="p-2 text-white/40 hover:text-white"><Sun className="w-4 h-4" /></button>
      </div>
    </div>
  );
};
