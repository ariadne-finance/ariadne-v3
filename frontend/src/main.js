import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { init } from './useWallet';
import * as Sentry from '@sentry/browser';

import './assets/css/main.scss';

init();

const app = createApp(App);

if (document.location.hostname !== 'localhost' && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    attachStacktrace: true
  });
}

app
  .use(router)
  .mount('#app');
