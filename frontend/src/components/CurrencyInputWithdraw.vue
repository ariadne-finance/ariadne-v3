<template>
  <div class="relative">
    <input
      :id="inputId"
      ref="input"
      :value="amount"
      :placeholder="placeholderText"
      :disabled="disabled"
      type="text"
      class="w-full border-2 border-primary-400 focus:border-primary-300 ring-0 focus:ring-4 focus:ring-primary-500/30 text-xl font-bold bg-black/30 placeholder:text-primary-400 h-[42px] items-center justify-between py-0 pl-4 pr-40"
      :class="!isAmountValid ? 'ring-2 ring-red-500' : ''"

      autocomplete="off"
      @input="onInput"
    >

    <Menu v-if="!hideSelector" as="div" class="absolute right-0 inset-y-0 inline-block text-left">
      <MenuButton
        class="inline-flex w-full justify-center items-center rounded-m p-4 h-full text-sm font-medium text-primary-400 focus:ring-0 focus-visible:outline-none"
        :disabled="disabled"
      >
        <div v-if="amount" class="pr-4" @click.stop="reset">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-6 h-6"
            fill="currentColor"
            viewBox="0 0 256 256"
          ><path d="M165.66,101.66,139.31,128l26.35,26.34a8,8,0,0,1-11.32,11.32L128,139.31l-26.34,26.35a8,8,0,0,1-11.32-11.32L116.69,128,90.34,101.66a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35a8,8,0,0,1,11.32,11.32ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z" /></svg>
        </div>
        <div class="text-2xl mr-1">[</div>
        <div v-if="selectedWithdrawToken" class="flex flex-nowrap gap-x-2 items-center pr-2">
          <div class="shrink-0 inline-flex items-center justify-center dark:opacity-90">
            <img class="block w-5 h-5" :src="selectedWithdrawTokenImgSrc" alt="">
          </div>
          <div class="shrink-0 text-primary-300">{{ selectedWithdrawToken }}</div>
        </div>

        <div class="arrow-down" />
        <div class="text-2xl ml-1">]</div>
      </MenuButton>

      <transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100"
        leave-active-class="transition duration-75 ease-in"
        leave-from-class="transform scale-100 opacity-100"
        leave-to-class="transform scale-95 opacity-0"
      >
        <MenuItems
          class="absolute z-10 -right-1 origin-top-right divide-y focus:outline-none bg-primary-600 p-1 shadow-[10px_10px_#000]"
        >
          <div class="border-2 border-primary-400 p-1">
            <MenuItem
              v-for="token in tokens"
              :key="token"
              v-slot="{ active }"
            >
              <button
                type="button"
                :class="[
                  active ? 'bg-primary-400 text-white' : 'opacity-70',
                  'flex flex-nowrap gap-x-2 items-center w-full min-w-max px-4 py-2 !border-0 shadow-none',
                ]"
                @click="tokenClicked(token)"
              >
                <div class="shrink-0 inline-flex items-center justify-center dark:opacity-90">
                  <img class="block w-5 h-5" :src="tokenImgSrc(token)" alt="">
                </div>
                <div class="shrink-0">{{ token }}</div>
              </button>
            </MenuItem>
          </div>
        </MenuItems>
      </transition>
    </Menu>
  </div>
</template>

<script setup>
import { ethers } from 'ethers';
import { ref, watch, computed } from 'vue';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue';

const props = defineProps({
  modelValue: {
    type: [ BigInt, null ],
    default: null
  },
  selectedWithdrawToken: {
    type: String,
    default: null
  },
  decimals: {
    type: Number,
    required: true
  },
  displayDecimals: {
    type: Number,
    required: false,
    default: 2
  },
  placeholder: {
    type: String,
    default: ''
  },
  max: {
    type: [ Number, BigInt, null ],
    default: null
  },
  min: {
    type: [ Number, BigInt, null ],
    default: null
  },
  disabled: {
    type: Boolean,
    default: false
  },
  inputId: {
    type: String,
    default: null
  },
  hideSelector: {
    type: Boolean,
    default: false
  },
  tokens: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits([ 'update:modelValue', 'update:selectedWithdrawToken' ]);

defineExpose({
  reset,
  setValue
});

const amount = ref('');

if (props.modelValue !== null && props.modelValue !== '') {
  amount.value = ethers.formatUnits(props.modelValue.toString(), props.decimals);
}

const input = ref(null);
const isAmountValid = ref(true);

watch(
  amount,
  value => {
    if (value) {
      let parsed = null;
      try {
        parsed = BigInt(ethers.parseUnits(amount.value, props.decimals));
        isAmountValid.value = true;
      } catch (e) {
        isAmountValid.value = false;
      }

      emit('update:modelValue', parsed);
      return;
    }

    isAmountValid.value = true;
    emit('update:modelValue', null);
  }
);

const placeholderText = computed(() => {
  if (props.placeholder) {
    return props.placeholder;
  }
  return props.decimals > 0 ? '0.0' : '0';
});

// const maxBigInt = computed(() => (typeof props.max === 'bigint' ? props.max : BigInt(props.max)));

function reset() {
  amount.value = '';
  emit('update:modelValue', null);
}

function setValue(v) {
  amount.value = ethers.formatUnits(v, props.decimals);
  emit('update:modelValue', v);
}

function onInput(e) {
  let value = e.target.value;
  value = value.replace(/[^0-9.]/g, '');

  if (value.startsWith('.')) {
    value = '0' + value;
  }

  const firstDot = value.indexOf('.');
  if (firstDot >= 0) {
    const secondDot = value.indexOf('.', firstDot + 1);
    if (secondDot >= 0) {
      value = value.substr(0, secondDot);
    }
  }

  const chunks = value.split('.');
  value = chunks[0];
  if (chunks.length > 1) {
    value += '.' + chunks[1].substr(0, props.decimals);
  }

  amount.value = value || null;
  input.value.value = value || null;
}

function tokenClicked(token) {
  emit('update:selectedWithdrawToken', token);
}

function tokenImgSrc(token) {
  const tokenLowerCase = (token || '').toLowerCase();
  const image = (tokenLowerCase === 'weth' || tokenLowerCase === 'testeth') ? 'eth' : tokenLowerCase;
  return `/coins/${image}.png`;
}

const selectedWithdrawTokenImgSrc = computed(() => tokenImgSrc(props.selectedWithdrawToken));
</script>
