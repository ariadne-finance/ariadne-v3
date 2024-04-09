<template>
  <div class="fixed z-10 top-2.5 right-1/2 translate-x-1/2 md:right-5 md:translate-x-0">
    <button-outline v-if="!connectedWallet" class="min-w-60" shadow @click="onClickConnect">
      {{ connectingWallet ? 'Connecting...' : connectedWallet ? 'Disconnect' : 'Connect Wallet' }}
    </button-outline>
  </div>
</template>

<script setup>
import { useOnboard } from '@web3-onboard/vue';
import ButtonOutline from './ButtonOutline.vue';

const { connectedWallet, connectingWallet, connectWallet, disconnectWallet } = useOnboard();

const onClickConnect = () => {
  const { provider, label } = connectedWallet.value || {};
  if (provider && label) {
    disconnectWallet({ label });
  } else {
    connectWallet();
  }
};
</script>
