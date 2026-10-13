import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath,URL} from 'node:url';
export default defineConfig({
  plugins:[react()],
  resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}},
  test:{ environment: 'jsdom' },
  server:{port:5173,strictPort:false,proxy:{
    '/api':{target:'http://localhost:4000',changeOrigin:true},
    '/health':{target:'http://localhost:4000',changeOrigin:true},
    '/docs':{target:'http://localhost:4000',changeOrigin:true},
    '/openapi.json':{target:'http://localhost:4000',changeOrigin:true}
  }},
  optimizeDeps:{exclude:['lucide-react']}
});
