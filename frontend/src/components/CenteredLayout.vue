<template>
  <div class="flex flex-col grow justify-center items-center w-full h-full px-4 relative">
    <div class="absolute top-4 left-4 hidden sm:block">
      <the-logo class="h-10" />
    </div>

    <div class="flex justify-center items-center text-left">
      <div class="py-10 mt-12">
        <div class="text-center sm:hidden mb-4">
          <the-logo class="h-10" />
        </div>
        <slot />

        <div class="sm:max-w-4xl mb-8 transition-all w-full text-center">
          <router-link v-if="route.name !== 'MainPage'" to="/" class="font-decorative text-base font-semibold text-white link-dashed">Home</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import TheLogo from './TheLogo.vue';
import { useRoute } from 'vue-router';

const route = useRoute();
</script>
