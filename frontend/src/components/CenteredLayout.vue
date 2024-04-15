<template>
  <div class="flex flex-col grow justify-center items-center w-full h-full px-4 relative">
    <slot />

    <div class="sm:max-w-4xl mb-8 transition-all w-full text-center">
      <router-link v-if="route.name !== 'MainPage'" to="/" class="font-decorative text-base font-semibold text-white link-dashed">Home</router-link>
    </div>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router';

const route = useRoute();
</script>
