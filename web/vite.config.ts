import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'

const config = defineConfig({
  plugins: [
    devtools(),
    // nitro is already integrated via tanstackStart - don't add separately
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    mdx({ remarkPlugins: [remarkGfm] }), // MDX with GFM tables support
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.mdx'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})

export default config
