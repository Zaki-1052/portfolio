/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Dev-only: gate the Theatre.js camera-authoring spike. 'true' enables it.
  readonly VITE_THEATRE_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// GLSL sources are imported as raw strings (Vite ?raw), composed into
// ShaderMaterials. No vite-plugin-glsl needed.
declare module '*.glsl?raw' {
  const src: string;
  export default src;
}
