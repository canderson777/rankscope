/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "mock" (default) or "live" — see .env.example */
  readonly VITE_DATA_SOURCE?: "mock" | "live";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
