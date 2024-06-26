<template>
  <centered-layout v-if="!connectedWallet">
    <div class="my-10 sm:mt-0 sm:mb-20 mx-2">
      <block-decorative class="sm:max-w-[800px]">
        <p class="mb-4">
          This on-chain strategy utilizes sDAI on the Gnosis blockchain — a high APY on your stables with minimal risk.
        </p>

        <p class="mb-4">
          You can bridge stables to Gnosis <a class="link-dashed" href="https://jumper.exchange/">here</a> and swap to
          <a class="link-dashed" href="https://swap.cow.fi/">here</a>.
        </p>

        <p>
          Only sDAI and xDai assets are traded, with no exposure to other protocols except Aave and
          Balancer (for flash loans only). The current APY is

          <template v-if="isApyReady">
            {{ apyHr }}
          </template>
          <template v-else>
            (loading)
          </template>

          and the verified contract address is:
          <a :href="'https://gnosisscan.io/address/' + ASDAI_CONTRACT_ADDRESS" class="block max-w-[calc(100vw-108px)] xs:inline truncate link-dashed">{{ ASDAI_CONTRACT_ADDRESS }}</a>
        </p>
      </block-decorative>
    </div>
    <div class="text-center">
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
          Switch to Gnosis
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
import BlockDecorative from '@/components/BlockDecorative.vue';
import ButtonError from './ButtonError.vue';
import { computed } from 'vue';
import { ASDAI_CONTRACT_ADDRESS } from '@/constants';
import { isApyReady, apyHr } from '@/apy';

const GNOSIS_CHAIN_ID = 0x64;

const { connectedWallet, setChain, connectWallet } = useOnboard();
const { chainId } = useWallet();

const isSupportedChain = computed(() => chainId.value == GNOSIS_CHAIN_ID); // eslint-disable-line eqeqeq
</script>
