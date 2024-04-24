<template>
  <div class="sm:min-w-[300px] flex flex-col">
    <div class="shink-0 font-bold text-center mb-10 mt-4">
      Deposit into vault
    </div>

    <div class="shrink-0 flex justify-center">
      <svg
        v-if="currentStep == SUCCESS"
        class="animate-ping-once h-10 w-10 text-green-500 fill-green-500"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
      >
        <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clip-rule="evenodd" />
      </svg>

      <loading-spinner v-else class="!h-20 text-primary-200" />
    </div>

    <div class="grow text-center mb-8 mt-2 text-primary-200">
      {{ currentStep }}
    </div>

    <!--
    <div v-if="data.step === data.steps?.length" class="shrink-0 flex justify-center">
      <button class="btn-primary" @click="emit('close')">Close</button>
    </div>
    -->

    <div v-if="data.steps?.length > 1 && currentStep != SUCCESS" class="shrink-0 mt-4 mb-6">
      <div class="flex flex-row items-center justify-center gap-x-2">
        <div
          v-for="step in data.steps?.length"
          :key="step"
          class="w-4 h-4 rounded-full border-[3px] bg-primary-600 border-primary-300 dark:border-primary-400"
          :class="{ 'opacity-40': step > data.step }"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { watch, computed } from 'vue';
import LoadingSpinner from './LoadingSpinner.vue';

const SUCCESS = 'Success!';

const props = defineProps({
  data: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits([ 'close' ]);

watch(() => props.data.close, val => {
  if (val) {
    emit('close');
  }
});

const currentStep = computed(() => props.data.steps[props.data.step - 1] || null);
</script>
