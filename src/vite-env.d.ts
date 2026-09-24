/// <reference types="vite/client" />

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
