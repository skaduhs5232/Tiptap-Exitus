import { resolve } from 'path'
import { fileURLToPath, URL } from 'url'
import { defineConfig } from 'vite'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import svgLoader from 'vite-svg-loader'

export default defineConfig({
  base: './',
  root: 'src',
  resolve: {
    alias: [{ find: '@icons', replacement: fileURLToPath(new URL('./src/assets/icons/Editor', import.meta.url)) }]
  },
  build: {
    sourcemap: true,
    polyfill: false,
    outDir: '../dist',
    emptyOutDir: true,
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'src/main.ts'),
      formats: ['umd'],
      name: 'ExitusEditor'
    },
    rollupOptions: {
      output: {
        entryFileNames: 'exituseditor.js'
      }
    }
  },
  plugins: [
    svgLoader({
      defaultImport: 'raw'
    }),
    cssInjectedByJsPlugin({ styleId: 'exitus-editor-style' })
  ]
})
