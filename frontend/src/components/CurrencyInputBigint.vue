<template>
  <div class="relative">
    <input
      :id="inputId"
      ref="input"
      :value="amount"
      :placeholder="placeholderText"
      :disabled="disabled"
      type="text"
      class="w-full border-0 text-xl font-bold bg-slate-100 dark:bg-[#1F232D] h-[50px] items-center justify-between rounded-[14px] py-0 pl-6 pr-10"
      :class="!isAmountValid ? 'ring-2 ring-red-500' : ''"
      autocomplete="off"
      @input="onInput"
    >

    <Menu v-if="!hideSelector" as="div" class="absolute right-0 inset-y-0 inline-block text-left">
      <MenuButton
        class="inline-flex w-full justify-center items-center rounded-m p-4 h-full text-sm font-medium text-slate-400 focus:ring-0"
        :disabled="disabled"
      >
        <div class="arrow-down" />
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
          class="absolute z-10 right-0 mt-1 origin-top-right divide-y rounded-xl theme-background theme-border theme-color shadow-lg focus:outline-none"
        >
          <MenuItem
            v-for="ratio in ratios"
            :key="ratio"
            v-slot="{ active }"
          >
            <button
              type="button"
              :class="[
                active ? 'bg-primary-400 text-white' : 'theme-color opacity-70',
                'flex flex-nowrap items-center w-full rounded-xl px-2 py-2 text-sm !border-0 shadow-none',
              ]"
              @click="ratioClicked(ratio)"
            >
              <div class="grow pl-2 py-1 text-right">
                {{ amountByRatio(ratio) }}
              </div>
              <div class="w-16 shrink-0 text-right pl-2 pr-2 py-1">
                {{ ratio }}%
              </div>
            </button>
          </MenuItem>
        </MenuItems>
      </transition>
    </Menu>
  </div>
</template>

<script setup>
import { ethers } from 'ethers';
import { ref, watch, computed } from 'vue';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue';

const ratios = [ 25, 50, 75, 100 ];

const props = defineProps({
  modelValue: {
    type: [ BigInt, null ],
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
  }
});

const emit = defineEmits([ 'update:modelValue' ]);

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

const maxBigInt = computed(() => (typeof props.max === 'bigint' ? props.max : BigInt(props.max)));

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

function amountByRatio(ratio) {
  if (!props.max) {
    return null;
  }

  const _amount = (maxBigInt.value * BigInt(ratio)) / 100n;

  let [ integer, decimals ] = ethers.formatUnits(_amount, props.decimals).split('.'); // eslint-disable-line prefer-const
  if (decimals.length > props.displayDecimals) {
    decimals = decimals.substring(0, props.displayDecimals);
  } else {
    decimals.padEnd(props.displayDecimals, '0');
  }

  return `${integer}.${decimals}`;
}

function ratioClicked(ratio) {
  if (props.disabled) {
    return;
  }

  if (!props.max) {
    return;
  }

  const max = (maxBigInt.value * BigInt(ratio)) / 100n;

  amount.value = ethers.formatUnits(max, props.decimals);
  emit('update:modelValue', max);
}

</script>
