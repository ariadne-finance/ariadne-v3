<template>
  <div
    class="inline-block font-decorative font-semibold text-white border border-silver"
    :class="isResponsive ? 'text-[12px] px-2.5 py-2 md:text-base md:px-3 md:py-[5px]' : 'text-base px-3 py-[5px]'"
  >
    FIXME
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
