/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FEATURE_CRT?: string;
  readonly VITE_FEATURE_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// non-standard stuff some browsers have. used by the fingerprint window
interface Navigator {
  readonly deviceMemory?: number;
  readonly globalPrivacyControl?: boolean;
}

interface Performance {
  // chrome only
  readonly memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
}
