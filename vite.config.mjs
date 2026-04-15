/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import svgLoader from 'vite-svg-loader';
import { fileURLToPath } from 'url';
import path from 'path';
import util from 'util';
import { exec } from 'child_process';

// const util = require('util');
const asyncExec = util.promisify(exec);

async function prepareVersioningEnv() {
  try {
    const execData = await asyncExec('git describe --tags --abbrev=0');
    process.env.VITE_APP_VERSION = execData.stdout;
  } catch (err) {
    process.env.VITE_APP_VERSION = '';
  }

  try {
    const execData = await asyncExec(`git log -1 --format=%ai ${process.env.VITE_APP_VERSION}`);
    process.env.VITE_APP_BUILD_DATE = execData.stdout;
  } catch (err) {
    process.env.VITE_APP_BUILD_DATE = '';
  }

  try {
    const execData = await asyncExec('git rev-parse --abbrev-ref HEAD');
    process.env.VITE_APP_BRANCH = execData.stdout;
  } catch (err) {
    process.env.VITE_APP_BRANCH = '';
  }
}

const filename = fileURLToPath(import.meta.url);
const pathSegments = path.dirname(filename);

export default defineConfig(async () => {
  try {
    await prepareVersioningEnv();
    const SERVER_PORT = process.env.SERVER_PORT || 3000;
    return {
      base: `/${process.env.VITE_BASE_URL || '/'}/`.replace(/\/+/g, '/'),
      plugins: [vue(), svgLoader()],
      resolve: {
        alias: {
          '@': path.resolve(pathSegments, './src'),
          '@root': path.resolve(pathSegments, './'),
        },
        extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue'],
      },
      server: {
        proxy: {
          // Proxy REST API calls to the local backend during development
          '/api': {
            target: `http://localhost:${SERVER_PORT}`,
            changeOrigin: true,
          },
          // Proxy remote control endpoint
          '/remote': {
            target: `http://localhost:${SERVER_PORT}`,
            changeOrigin: true,
          },
          // Proxy WebSocket connection to the backend
          '/ws': {
            target: `ws://localhost:${SERVER_PORT}`,
            ws: true,
          },
        },
      },
    };
  } catch (err) {
    return err;
  }
});
