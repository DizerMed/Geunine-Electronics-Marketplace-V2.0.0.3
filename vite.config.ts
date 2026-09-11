import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    build: {
      outDir: 'dist',
      target: 'es2022',
      cssCodeSplit: true,
      assetsInlineLimit: 4096,
      sourcemap: false,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1200,
      modulePreload: {
        polyfill: false,
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react/') || id.includes('react-dom/')) {
                return 'vendor-react';
              }
              if (
                id.includes('jspdf') ||
                id.includes('html-to-image') ||
                id.includes('html2canvas-pro') ||
                id.includes('canvg') ||
                id.includes('dompurify')
              ) {
                return 'vendor-pdf';
              }
              if (id.includes('recharts')) {
                return 'vendor-charts';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('motion')) {
                return 'vendor-motion';
              }
              if (id.includes('@dnd-kit')) {
                return 'vendor-dnd';
              }
              if (id.includes('qrcode')) {
                return 'vendor-qrcode';
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
            }
          },
        },
      },
    },
    esbuild: {
      legalComments: 'none',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'lucide-react',
        'jspdf',
        'html-to-image',
        'qrcode.react',
      ],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
