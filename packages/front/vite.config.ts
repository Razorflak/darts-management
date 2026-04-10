import 'dotenv/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  define: {
    __DATABASE_URL__: JSON.stringify(process.env.DATABASE_URL)
  }
});
