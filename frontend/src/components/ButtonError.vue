<template>
  <div class="">
    <button
      class=" bg-error hover:bg-error/80 font-decorative font-normal text-white px-16 py-3 rounded"
      :disabled="disabled"
      v-bind="$attrs"
    >
      <slot />
    </button>
  </div>
</template>

<script setup>
defineOptions({
  inheritAttrs: false
});

defineProps({
  disabled: {
    type: Boolean,
    default: false
  }
});
</script>
