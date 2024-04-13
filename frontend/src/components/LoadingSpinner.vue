<template>
  <div class="flex justify-center items-center h-screen">
    <svg class="rectangles" width="30%" viewBox="0 0 484 484" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect :class="{ animate: highlightedId === 0 }" x="1.41421" y="241.848" width="58.8586" height="58.8586" transform="rotate(-45 1.41421 241.848)" stroke="currentColor" stroke-width="2" />
      <rect :class="{ animate: highlightedId === 1 }" x="15.1859" y="241.848" width="89.2879" height="89.2879" transform="rotate(-45 15.1859 241.848)" stroke="currentColor" stroke-width="2" />
      <rect :class="{ animate: highlightedId === 2 }" x="28.9551" y="241.848" width="119.717" height="119.717" transform="rotate(-45 28.9551 241.848)" stroke="currentColor" stroke-width="2" />
      <rect :class="{ animate: highlightedId === 3 }" x="42.7268" y="241.848" width="150.147" height="150.147" transform="rotate(-45 42.7268 241.848)" stroke="currentColor" stroke-width="2" />
      <rect :class="{ animate: highlightedId === 4 }" x="56.496" y="241.848" width="180.576" height="180.576" transform="rotate(-45 56.496 241.848)" stroke="currentColor" stroke-width="2" />
      <rect :class="{ animate: highlightedId === 5 }" x="70.2677" y="241.848" width="211.005" height="211.005" transform="rotate(-45 70.2677 241.848)" stroke="currentColor" stroke-width="2" />
      <rect :class="{ animate: highlightedId === 6 }" x="84.0393" y="241.848" width="241.434" height="241.434" transform="rotate(-45 84.0393 241.848)" stroke="currentColor" stroke-width="2" />
      <rect :class="{ animate: highlightedId === 7 }" x="97.8086" y="241.848" width="271.864" height="271.864" transform="rotate(-45 97.8086 241.848)" stroke="currentColor" stroke-width="2" />
    </svg>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

let interval = null;
const highlightedId = ref(0);

onMounted(() => {
  interval = setInterval(() => {
    highlightedId.value++;
    if (highlightedId.value > 7) {
      highlightedId.value = 0;
    }
  }, 400);
});

onBeforeUnmount(() => {
  clearInterval(interval);
});
</script>

<style scoped>
.rectangles rect {
  @apply text-primary-500;
  transition: stroke 400ms, stroke-width 400ms;
}
.rectangles rect.animate {
  @apply text-primary-200;
  stroke-width: 3;
}
</style>
