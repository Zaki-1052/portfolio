// src/app.tsx
import { Canvas } from '@react-three/fiber';
import { TissueContent } from '@/scales/tissue/TissueContent';
import { CellularContent } from '@/scales/cellular/CellularContent';
import { ChromatinContent } from '@/scales/chromatin/ChromatinContent';
import { ProteinContent } from '@/scales/protein/ProteinContent';
import { CodeContent } from '@/scales/code/CodeContent';
import { ExpressionContent } from '@/scales/expression/ExpressionContent';
import { DepthIndicator } from '@/components/DepthIndicator';

export function App() {
  return (
    <>
      <Canvas
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1,
        }}
        gl={{ antialias: true }}
        dpr={[1, 2]}
        frameloop="demand"
        camera={{ fov: 50, near: 0.1, far: 1000, position: [0, 0, 50] }}
      >
        <color attach="background" args={['#282c34']} />
      </Canvas>
      <main>
        <TissueContent />
        <CellularContent />
        <ChromatinContent />
        <ProteinContent />
        <CodeContent />
        <ExpressionContent />
      </main>
      <DepthIndicator />
    </>
  );
}
