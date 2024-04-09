import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { init } from './useWallet';
import './useDark';

import './assets/css/main.scss';

init();

createApp(App)
  .use(router)
  .mount('#app');
