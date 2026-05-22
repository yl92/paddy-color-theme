import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { themesApiPlugin } from './src/lib/themesApiPlugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    themesApiPlugin({
      themesDir: path.resolve(process.cwd(), '../themes/default'),
      uprightDir: path.resolve(process.cwd(), '../themes/upright'),
      metaFile: path.resolve(process.cwd(), 'themes-meta.json'),
      packageFile: path.resolve(process.cwd(), '../package.json'),
    }),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        loadPaths: [path.resolve(__dirname, 'src/styles')],
        additionalData: (source: string, fp: string) => {
          // Don't inject into the variables partial itself (circular).
          if (fp.endsWith('_variables.scss')) return source;
          return `@use 'variables' as *;\n${source}`;
        },
      },
    },
  },
  server: { port: 5180 },
});
