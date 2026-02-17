import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'ayvi',
      filename: 'remoteEntry.js',
      dts: false,
      exposes: {
        './App': './src/App.jsx',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
  server: {
    origin: 'http://localhost:5173',
  },
  build: {
    target: 'esnext',
    modulePreload: false,
    minify: false,
    cssCodeSplit: false,
  },
})
