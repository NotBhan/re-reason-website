// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Static-first: the starter ships as pre-rendered HTML. Interactive pieces are
  // opted into client-side JavaScript individually with Astro client directives.
  integrations: [react()],

  vite: {
    // Tailwind CSS v4 is wired in through the official Vite plugin. The
    // stylesheet itself is imported once, from `src/styles/global.css`.
    plugins: [tailwindcss()],
  },
});
