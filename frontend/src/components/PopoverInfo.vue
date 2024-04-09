<template>
  <Popover class="relative inline-flex text-left">
    <PopoverButton class="focus-visible:outline-none flex items-center gap-x-1.5 text-slate-400" :disabled="disabled">
      <slot />
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 fill-current -mt-px" :class="{ 'opacity-30': disabled }" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm16-40a8,8,0,0,1-8,8,16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40A8,8,0,0,1,144,176ZM112,84a12,12,0,1,1,12,12A12,12,0,0,1,112,84Z" /></svg>
    </PopoverButton>

    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-1 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-1 opacity-0"
    >
      <PopoverPanel v-slot="{ close }" class="absolute left-auto md:left-1/2 -right-8 md:right-auto z-10 mt-3 w-screen max-w-sm md:-translate-x-1/2 transform px-2 sm:px-0 sm:max-w-xl">
        <button class="absolute top-3 right-7 sm:right-3 opacity-60 hover:opacity-100" @click="close">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 fill-current" viewBox="0 0 256 256"><path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" /></svg>
        </button>

        <div class="theme-background theme-border theme-radius theme-shadow px-4 sm:px-8 py-8">
          <div v-for="(item, key) in details" :key="key">
            <div class="flex flex-col sm:flex-row sm:items-center w-full gap-x-8 my-4 sm:my-2">
              <div class="grow text-slate-400 dark:text-slate-600">
                {{ item.title }}
              </div>
              <div v-if="item.value !== undefined" class="flex-grow-0 flex-shrink-0 tabular-nums">
                {{ item.value }}
              </div>
            </div>
          </div>
        </div>
      </PopoverPanel>
    </transition>
  </Popover>
</template>

<script setup>
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue';

defineProps({
  details: {
    type: Array,
    default: () => []
  },
  disabled: {
    type: Boolean,
    default: false
  }
});
</script>
