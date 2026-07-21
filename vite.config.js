import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  css: {
    postcss: false,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        superadmin: resolve(__dirname, 'super-admin/index.html'),
        owner: resolve(__dirname, 'owner/index.html'),
        kitchen: resolve(__dirname, 'kitchen/index.html'),
        waiter: resolve(__dirname, 'waiter/index.html'),
        customer: resolve(__dirname, 'customer/index.html')
      }
    }
  }
});
