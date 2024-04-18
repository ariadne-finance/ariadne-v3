<template>
  <div>
    <button class="btn font-normal bg-primary-500 px-10 py-3 text-nowrap" v-bind="$attrs">
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
