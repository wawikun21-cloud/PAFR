import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const isDocker = process.env.VITE_DOCKER === 'true';
const apiTarget = process.env.VITE_API_TARGET || (isDocker ? "http://pafr-server:5000" : "http://localhost:5000");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  base: "/",
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});
