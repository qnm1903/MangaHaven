import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
// import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { lingui } from '@lingui/vite-plugin'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env from parent dir (.env file) - for local dev
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
  // In Docker: no .env file, vars come from process.env (set via ARG/ENV in Dockerfile)
  const VITE_BACKEND_URL = env.VITE_BACKEND_URL || process.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const VITE_OAUTH_CLIENT_ID = env.VITE_OAUTH_CLIENT_ID || process.env.VITE_OAUTH_CLIENT_ID || '';
  return {
    plugins: [tanstackRouter({target: 'react', autoCodeSplitting: true}), react({ plugins: [['@lingui/swc-plugin', {}]] }), lingui(), tailwindcss()],
    define: {
      'import.meta.env.VITE_OAUTH_CLIENT_ID': JSON.stringify(VITE_OAUTH_CLIENT_ID),
      'import.meta.env.VITE_BACKEND_URL': JSON.stringify(VITE_BACKEND_URL),
    },
    envDir: path.resolve(__dirname, '..'),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    server: {
      proxy: {
        '/api': {
          target: VITE_BACKEND_URL,
          changeOrigin: true,
          secure: false
        }
      }
    }
  }
})
