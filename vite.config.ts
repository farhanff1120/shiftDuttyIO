import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Sesuaikan nama repo
export default defineConfig({
  base: '/shiftDuttyIO/',  
  plugins: [react()]
})