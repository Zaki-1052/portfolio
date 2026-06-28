// src/app.tsx
import { Canvas } from '@react-three/fiber';
import { SCALES, type ScaleName } from '@/stores/depth';

const SCALE_LABELS: Record<ScaleName, string> = {
  tissue: 'Tissue / Brain',
  cellular: 'Cellular / Neuron',
  chromatin: 'Chromatin / Nuclear',
  protein: 'Protein / MD',
  code: 'Code / Terminal',
  expression: 'Expression / Contact',
};

function ScaleSection({ scale }: { scale: ScaleName }) {
  return (
    <section
      id={scale}
      data-scale={scale}
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg)',
        color: 'var(--text-body)',
        padding: 'var(--section-pad-y) var(--gutter)',
        position: 'relative',
        zIndex: 'var(--z-content)',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--text-3xl)',
          color: 'var(--text-strong)',
          lineHeight: 'var(--leading-tight)',
          letterSpacing: 'var(--tracking-tight)',
          marginBottom: 'var(--space-5)',
        }}
      >
        {SCALE_LABELS[scale]}
      </h2>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-md)',
          lineHeight: 'var(--leading-relaxed)',
          maxWidth: 'var(--measure)',
          color: 'var(--text-body)',
        }}
      >
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
        labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
        laboris nisi ut aliquip ex ea commodo consequat.
      </p>
    </section>
  );
}

export function App() {
  return (
    <>
      <Canvas
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
        {SCALES.map((scale) => (
          <ScaleSection key={scale} scale={scale} />
        ))}
      </main>
    </>
  );
}
