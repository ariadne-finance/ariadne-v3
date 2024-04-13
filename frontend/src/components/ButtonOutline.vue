<template>
  <div>
    <button class="theme-background font-decorative font-normal text-white px-16 py-3 rounded" v-bind="$attrs">
      <slot />
    </button>
  </div>
</template>

<script setup>
defineOptions({
  inheritAttrs: false
});

defineProps({
  shadow: {
    type: Boolean,
    default: false
  }
});
</script>
