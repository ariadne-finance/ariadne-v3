<template>
  <div>
    <button class="btn font-normal bg-primary-500 px-16 py-3 rounded" v-bind="$attrs">
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
