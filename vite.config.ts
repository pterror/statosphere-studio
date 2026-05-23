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
        formats: ['es', 'cjs', 'umd'],
        fileName: (format) => {
          if (format === 'es') return 'statosphere-studio.es.js'
          if (format === 'cjs') return 'statosphere-studio.cjs'
          return 'statosphere-studio.umd.cjs'
        },
      },
      rollupOptions: {
        external: ['vue', 'pinia', 'marked', 'ajv', 'ajv-formats'],
        output: {
          globals: {
            vue: 'Vue',
            pinia: 'Pinia',
            marked: 'marked',
            ajv: 'Ajv',
            'ajv-formats': 'ajvFormats',
          },
        },
      },
    },
  }
})
