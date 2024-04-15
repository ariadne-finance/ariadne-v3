<template>
  <div class="">
    <button
      class="btn bg-error hover:bg-error/80 font-normal text-black px-16 py-3"
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
