import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const yahooProxy = {
  target:      'https://query1.finance.yahoo.com',
  changeOrigin: true,
  rewrite:     (path) => path.replace(/^\/api\/yf/, ''),
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  },
}

export default defineConfig({
  plugins: [react()],
  server:  { proxy: { '/api/yf': yahooProxy } },
  preview: { proxy: { '/api/yf': yahooProxy } },
})
