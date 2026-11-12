import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {ocrAssets} from './ocr-assets.mjs';
export default defineConfig({plugins:[react(),ocrAssets()],build:{outDir:'standalone-dist',emptyOutDir:false,manifest:true}});
