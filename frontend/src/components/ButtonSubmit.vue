<template>
  <button
    type="submit"
    class="btn bg-primary-100 hover:bg-[#8dfcb0] disabled:bg-primary-500 text-black disabled:text-primary-300"
    :disabled="disabled"
    v-bind="$attrs"
  >
    <the-spinner v-if="busy" class="mr-3 h-5 w-5" />

    <slot>Submit</slot>
  </button>
</template>

<script setup>
import TheSpinner from './TheSpinner.vue';

defineProps({
  disabled: {
    type: Boolean,
    default: false
  },
  busy: {
    type: Boolean,
    default: false
  }
});
</script>
