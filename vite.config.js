import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    host: true // 允许局域网访问,方便手机连电脑调试
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js']
  }
});
