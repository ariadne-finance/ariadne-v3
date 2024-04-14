<template>
  <div class="">
    <button
      type="submit"
      class="btn bg-primary-100 disabled:bg-primary-500"
      :disabled="disabled"
      v-bind="$attrs"
    >
      <the-spinner v-if="busy" class="animate-spin -ml-8 mr-3 h-5 w-5" />

      <slot>Submit</slot>
    </button>
  </div>
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
