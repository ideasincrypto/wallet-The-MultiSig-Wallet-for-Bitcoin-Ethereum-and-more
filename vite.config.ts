import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      stream: 'stream-browserify',
      crypto: 'crypto-browserify',
      process: 'process/browser',
      '@assets': '/src/assets',
      '@storage': '/src/storage',
      '@components': '/src/components',
      '@pages': '/src/pages',
      '@utils': '/src/utils',
      '@lib': '/src/lib',
      '@types': '/src/types',
      '@hooks': '/src/hooks',
      '@context': '/src/context',
      '@config': '/src/config',
      '@constants': '/src/constants',
      '@services': '/src/services',
      '@styles': '/src/styles',
      '@routes': '/src/routes',
    },
  },
});
