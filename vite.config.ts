import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const llmProxy = {
  '/llm-api': {
    target: 'http://127.0.0.1:1234',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/llm-api/, '/api'),
    router: (req: { headers: { [key: string]: string | string[] | undefined } }) => {
      const raw = req.headers['x-llm-host']
      const host = Array.isArray(raw) ? raw[0] : raw
      return `http://${host || '127.0.0.1'}:1234`
    },
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: true,
    port: 5173,
    proxy: llmProxy,
  },
  preview: {
    host: true,
    port: 4173,
    proxy: llmProxy,
  },
})
