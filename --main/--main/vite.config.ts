import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { ttsProxyPlugin } from './vite-plugin-tts'

export default defineConfig({
  plugins: [
    react(), 
    ttsProxyPlugin()  // 添加TTS代理插件
  ],
  server: {
    proxy: {
      '/api/dictionary': {
        target: 'https://api.dictionaryapi.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/dictionary/, ''),
        secure: false
      },
      '/api/translate': {
        target: 'https://api.mymemory.translated.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/translate/, ''),
        secure: false
      },
      '/api/baidu': {
        target: 'https://fanyi-api.baidu.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/baidu/, ''),
        secure: false
      }
    }
  }
})
