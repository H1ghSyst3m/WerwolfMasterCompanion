import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command, mode }) => ({
  base: mode === 'capacitor' ? './' : command === 'build' ? '/WerwolfMasterCompanion/' : '/',
  ...(mode === 'capacitor' && { build: { outDir: 'dist-app' } }),
  plugins: [
    react(),
    tailwindcss(),
  ],
}))