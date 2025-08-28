import { defineConfig } from 'vite'
import { getPlatformProxy } from 'wrangler'

export default defineConfig({
  plugins: [
    {
      name: 'wrangler-pages',
      config: (config, { command }) => {
        if (command === 'build') {
          config.build = config.build || {}
          config.build.rollupOptions = config.build.rollupOptions || {}
          config.build.rollupOptions.input = 'src/index.tsx'
          config.build.rollupOptions.output = {
            entryFileNames: '_worker.js',
            format: 'es'
          }
        }
      }
    }
  ],
  build: {
    lib: {
      entry: './src/index.tsx',
      formats: ['es'],
      fileName: () => '_worker.js'
    },
    rollupOptions: {
      external: ['node:async_hooks']
    },
    outDir: 'dist'
  }
})