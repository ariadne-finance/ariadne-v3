<template>
  <a :href="to" target="_blank" class="flex items-center underline underline-offset-2 cursor-pointer">
    <slot />
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="ml-1 h-6 w-6 opacity-50"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="2"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  </a>
</template>

<script setup>
defineProps({
  to: {
    type: String,
    default: null
  }
});
</script>

<style scoped>
svg {
  width: 20px;
  margin-top: -3px;
}
</style>
