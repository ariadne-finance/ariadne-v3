<template>
  <centered-layout v-if="!connectedWallet">
    <page-decorations>
      <div class="max-w-max mx-auto text-left">
        <the-title />
      </div>
    </page-decorations>
  </centered-layout>

  <deposit-widget v-if="isSupportedChain" />

  <centered-layout v-else>
    <div class="-mt-8 inline-flex flex-col justify-center items-stretch">
      <div class="mb-8 text-center">
        Unsupported chain
      </div>

      <button-error
        class="mb-4"
        @click="setChain({ chainId: 0x64 })"
      >
        Switch to Gnosis FIXME
      </button-error>
    </div>
  </centered-layout>
</template>

<script setup>
import { useOnboard } from '@web3-onboard/vue';
import { useWallet } from '@/useWallet';
import DepositWidget from '@/components/DepositWidget.vue';
import CenteredLayout from '@/components/CenteredLayout.vue';
import TheTitle from './TheTitle.vue';
import ButtonError from './ButtonError.vue';
import PageDecorations from './PageDecorations.vue';
import { computed } from 'vue';

const { connectedWallet, setChain } = useOnboard();
const { chainId } = useWallet();

const isSupportedChain = computed(() => chainId.value == 0x64);
</script>
