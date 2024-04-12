<template>
  <centered-layout v-if="!connectedWallet">
    <div class="pb-20 relative">
      <div class="max-w-max mx-auto text-left">
        <the-title />
      </div>
    </div>
    <div>
      <button-error class="mb-4" @click="connectWallet()">
        Connect wallet
      </button-error>
    </div>
  </centered-layout>

  <template v-else>
    <deposit-widget v-if="isSupportedChain" />

    <centered-layout v-else>
      <div class="-mt-8 inline-flex flex-col justify-center items-stretch">
        <div class="mb-8 text-center">
          Unsupported chain
        </div>

        <button-error
          class="mb-4"
          @click="setChain({ chainId: GNOSIS_CHAIN_ID })"
        >
          Switch to Gnosis FIXME
        </button-error>
      </div>
    </centered-layout>
  </template>
</template>

<script setup>
import { useOnboard } from '@web3-onboard/vue';
import { useWallet } from '@/useWallet';
import DepositWidget from '@/components/DepositWidget.vue';
import CenteredLayout from '@/components/CenteredLayout.vue';
import TheTitle from './TheTitle.vue';
import ButtonError from './ButtonError.vue';
import { computed } from 'vue';

const GNOSIS_CHAIN_ID = 0x64;

const { connectedWallet, setChain, connectWallet } = useOnboard();
const { chainId } = useWallet();

const isSupportedChain = computed(() => chainId.value == GNOSIS_CHAIN_ID); // eslint-disable-line eqeqeq
</script>
