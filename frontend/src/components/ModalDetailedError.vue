<template>
  <Disclosure v-slot="{ open }" as="div" class="w-full max-w-xl">
    <DisclosureButton
      class="flex w-full justify-between px-8 py-4 text-left text-amber"
    >
      <span>{{ data.text }}</span>
      <div class="inline-flex items-center -mt-1.5 ml-2">
        <div class="text-2xl mr-1">[</div>
        <div class="arrow-down" :class="{ 'rotate-180': open }" />
        <div class="text-2xl ml-1">]</div>
      </div>
    </DisclosureButton>
    <transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="transform max-h-0"
      enter-to-class="transform max-h-[1000px]"
      leave-active-class="transition duration-100 ease-out"
      leave-from-class="transform max-h-[1000px]"
      leave-to-class="transform max-h-0"
    >
      <DisclosurePanel class="px-8 pb-8 pt-4 text-sm text-amber-dark break-all overflow-hidden">
        {{ data.detailsMessage }}
      </DisclosurePanel>
    </transition>
  </Disclosure>
</template>

<script setup>
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue';

defineProps({
  data: {
    type: Object,
    required: true
  }
});
</script>
