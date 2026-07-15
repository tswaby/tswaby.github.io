import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // Set the base path to relative so assets resolve correctly in subdirectories
  base: './', 
  
  build: {
    // Redirect the production build directory from the default 'dist' to 'docs'
    outDir: 'docs',
    
    // Empty the output directory on build to prevent old, unused files from sticking around
    emptyOutDir: true,
  }
})