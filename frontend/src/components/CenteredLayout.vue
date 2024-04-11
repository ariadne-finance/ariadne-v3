<template>
  <div class="flex flex-col grow justify-around items-center w-full h-full px-4">
    <div class="mt-22 px-4 py-8 xs:px-[35px] xs:py-12 mb-8 theme-background theme-border theme-radius theme-shadow sm:max-w-4xl w-full text-center">
      <slot />
    </div>

    <div class="sm:max-w-4xl mb-8 transition-all w-full text-center">
      <router-link v-if="route.name !== 'MainPage'" to="/" class="font-decorative text-base font-semibold text-white link-dashed">Home</router-link>
    </div>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router';

const route = useRoute();
</script>
