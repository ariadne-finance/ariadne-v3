import path from 'path';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import rollupPolyfillNode from 'rollup-plugin-polyfill-node';
import nodeStdlibBrowser from 'node-stdlib-browser';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';

const target = [ 'es2023', 'chrome122', 'edge122', 'firefox122', 'safari16' ];

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3090'
    }
  },

  plugins: [ vue() ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@abi': path.resolve(__dirname, '../abi/'),

      // Enable polyfill node used in development to prevent from vite's browser compatibility warning
      ...nodeStdlibBrowser
    }
  },

  build: {
    sourcemap: true,
    emptyOutDir: true,
    outDir: '../frontend-dist',
    target,
    chunkSizeWarningLimit: '2000k',
    rollupOptions: {
      plugins: [
        // Enable rollup polyfills plugin used in production bundling, refer to https://stackoverflow.com/a/72440811/10752354
        rollupPolyfillNode()
      ]
    },
    commonjsOptions: {
      transformMixedEsModules: true // Enable @walletconnect/web3-provider which has some code in CommonJS
    }
  },

  optimizeDeps: {
    esbuildOptions: {
      target,
      define: {
        global: 'globalThis'
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          process: true
        })
      ]
    }
  }
});
