/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_FUNCTIONS_URL: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.mdx' {
  import type { ComponentType } from 'react';

  export const frontmatter: {
    title: string;
    description: string;
    order: number;
    section: string;
    type: string;
    duration: string;
    topics?: string[];
  };

  const MDXContent: ComponentType;
  export default MDXContent;
}
