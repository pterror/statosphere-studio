import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  if (mode !== 'lib') {
    return {
      plugins: [vue()],
      build: {
        outDir: 'dist/spa',
      },
    }
  }
  return {
    plugins: [
      vue(),
      dts({
        outDir: ['dist'],
        include: ['src/**/*.ts', 'src/**/*.vue'],
        staticImport: true,
        rollupTypes: true,
        insertTypesEntry: true,
      }),
    ],
    build: {
      outDir: 'dist',
      lib: {
        entry: resolve(__dirname, 'src/lib.ts'),
        name: 'StatosphereStudio',
        formats: ['es', 'umd'],
        fileName: (format) => `statosphere-studio.${format}.${format === 'es' ? 'js' : 'cjs'}`,
      },
      rollupOptions: {
        external: ['vue'],
        output: {
          globals: { vue: 'Vue' },
        },
      },
    },
  }
})
