import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { init } from './useWallet';
import * as Sentry from '@sentry/vue';

import './assets/css/main.scss';

init();

const app = createApp(App);

if (location.hostname !== 'localhost') {
  Sentry.init({
    app,
    dsn: 'https://6deeac70d0248fd4e917bc6a6791a600@o4506603836342272.ingest.us.sentry.io/4507123645874176',
    attachStacktrace: true
  });
}

app
  .use(router)
  .mount('#app');
