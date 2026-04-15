import { createApp, reactive } from 'vue';
import axios from 'axios';
import uikit from '@/views/components/uikit';
import utils from '@/views/utils';
import EventBus from '@/plugins/eventbus';
import '@/assets/styles/global.css';
import '@/assets/styles/fonts.css';
import ShowSingleton from '@/singletons/show.singleton';
import MidiController from '@/plugins/midi';
import router from './plugins/router';
import App from './App.vue';

function registerComponents(components, app) {
  Object.keys(components).forEach((componentKey) => {
    const component = components[componentKey];
    if (component.name) {
      app.component(component.name, component);
    } else {
      registerComponents(component, app);
    }
  });
}

try {
  const app = createApp(App);
  registerComponents(uikit, app);
  app.config.globalProperties.$show = reactive(ShowSingleton);
  app.config.globalProperties.$http = axios;
  app.config.globalProperties.$utils = reactive(utils);

  // Prefix all relative axios requests with the app's base path so that
  // sub-path deployments (e.g. GitHub Pages) resolve assets correctly.
  axios.defaults.baseURL = import.meta.env.BASE_URL;

  // Global Vue error handler – surface errors as non-blocking toast events
  app.config.errorHandler = (err) => {
    console.error('[ASLS Studio]', err);
    EventBus.emit('app_error', err);
  };

  // Catch unhandled promise rejections and report them
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[ASLS Studio] Unhandled rejection:', event.reason);
    EventBus.emit('app_error', event.reason);
  });

  app.use(router);
  app.mount('#app');

  // Initialise MIDI in the background (non-blocking – will silently fail if
  // the browser doesn't support Web MIDI or the user denies the permission).
  MidiController.init().catch(() => {});
} catch (err) {
  console.error('[ASLS Studio] Fatal startup error:', err);
}
