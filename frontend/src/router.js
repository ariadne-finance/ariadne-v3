import { createWebHistory, createRouter } from 'vue-router';

import MainComponent from './components/MainComponent.vue';

const routes = [
  {
    path: '/',
    component: MainComponent,
    name: 'MainPage'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    const el = document.querySelector('#app');
    el.scrollTop = 0;
  }
});

export default router;
