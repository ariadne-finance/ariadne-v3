<template>
  <div
    class="inline-flex justify-center items-center font-decorative text-white border border-silver text-xl w-[52px] h-[52px]"
  >
    S<span class="text-accent">N</span>
  </div>
</template>

<script setup>
defineProps({
  isResponsive: {
    type: Boolean,
    default: false
  }
});
</script>
