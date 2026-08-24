/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// base: './' —— 相对路径，适配 GitHub Pages 等任意静态托管
export default defineConfig({
  base: './',
  server: {
    host: true, // 暴露到局域网，便于 iPhone 真机调试（同一 WiFi）
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate', // 静默自动更新：后台下载新版本，下次打开生效，无需用户操作
      manifest: {
        name: '童课',
        short_name: '童课',
        description: '儿童培训课程管理',
        lang: 'zh-CN',
        display: 'standalone',
        start_url: './',
        scope: './',
        theme_color: '#EA580C',
        background_color: '#F7F7F8',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts'],
  },
})
