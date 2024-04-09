<template>
  <centered-layout>
    <div class="text-left w-full p-4 sm:p-10">
      <div class="flex w-full flex-col gap-7.5">
        <collapse :when="!!$slots.info" class="transition-height">
          <div class="rounded-[14px] text-green-800 dark:text-green-200 bg-green-100 my-5 p-5 ring-1 ring-green-200 dark:bg-green-800 dark:ring-green-700">
            <slot name="info" />
          </div>
        </collapse>

        <div class="flex flex-col gap-[25px] md:flex-row">
          <div class="flex flex-1 flex-col flex-wrap gap-7 md:flex-row md:gap-14">
            <div class="flex flex-1 flex-col">
              <dl class="flex">
                <div class="flex flex-1 flex-col gap-[5px]">
                  <dt class="text-sm leading-5 text-slate-400" @click="balanceClicked++">Your balance</dt>
                  <dd class="text-xl font-bold leading-[30px]">${{ balance }}</dd>
                  <div class="text-slate-400 font-light text-sm -mt-1">{{ approximateEthBalanceHr }}</div>
                </div>
                <div v-if="chainId === 0x2105" class="flex flex-col gap-[5px]">
                  <dt class="text-sm leading-5 text-right">
                    <popover-apy-base>APY</popover-apy-base>
                  </dt>
                  <dd class="text-xl font-bold leading-[30px]">≈1%</dd>
                </div>
                <div v-else class="flex flex-col gap-[5px]">
                  <dt class="text-sm leading-5 text-right">
                    <popover-info :details="apyDetails" :disabled="apyDetails === null">APY</popover-info>
                  </dt>
                  <dd class="text-xl font-bold leading-[30px]">{{ apyHr }}</dd>
                </div>
              </dl>

              <hr class="my-4 border-t border-slate-200 dark:border-slate-800">

              <div class="mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="#1970b3" viewBox="0 0 17 10" class="w-full"> <rect x="0" y="6" width="1" height="3" /> <rect x="1" y="5" width="3" height="1" /> <rect x="1" y="9" width="3" height="1" /> <rect x="4" y="0" width="1" height="10" /> <rect x="6" y="5" width="4" height="1" /> <rect x="6" y="6" width="1" height="4" /> <rect x="10" y="6" width="1" height="4" /> <rect x="12" y="6" width="1" height="3" /> <rect x="13" y="5" width="3" height="1" /> <rect x="13" y="9" width="3" height="1" /> <rect x="16" y="0" width="1" height="10" /> </svg>
              </div>
            </div>

            <div class="flex min-h-max w-full flex-1 flex-col gap-5 md:basis-[11.5%]">
              <div class="flex gap-x-4">
                <div class="flex w-full rounded-[14px] bg-slate-100 p-[5px] text-sm font-semibold dark:bg-slate-800">
                  <div class="flex flex-1">
                    <input
                      id="deposit"
                      v-model="selectedTab"
                      type="radio"
                      name="type"
                      class="peer sr-only"
                      value="deposit"
                    ><label
                      class="flex h-10 flex-1 cursor-pointer items-center justify-center rounded-2.5 transition-colors peer-checked:bg-white dark:peer-checked:bg-slate-900"
                      for="deposit"
                    >Deposit</label>
                  </div>
                  <div class="flex flex-1">
                    <input
                      id="withdraw"
                      v-model="selectedTab"
                      class="peer sr-only"
                      type="radio"
                      name="type"
                      value="withdraw"
                    ><label
                      class="flex h-10 flex-1 cursor-pointer items-center justify-center rounded-2.5 transition-colors peer-checked:bg-white dark:peer-checked:bg-slate-900"
                      for="withdraw"
                    >
                      Withdraw
                    </label>
                  </div>
                </div>
                <div class="flex grow-0 shrink-0">
                  <button
                    class="btn rounded-[14px] bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 hover:bg-slate-200/80 hover:dark:bg-slate-600/50"
                    :class="{ 'bg-slate-100 dark:bg-slate-800': isRefetching }"
                    :disabled="isRefetching"
                    @click="emit('refetch')"
                  >
                    <svg
                      class="w-5 h-5"
                      :class="{ 'animate-spin': isRefetching }"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                      viewBox="0 0 256 256"
                    ><path d="M240,56v48a8,8,0,0,1-8,8H184a8,8,0,0,1,0-16H211.4L184.81,71.64l-.25-.24a80,80,0,1,0-1.67,114.78,8,8,0,0,1,11,11.63A95.44,95.44,0,0,1,128,224h-1.32A96,96,0,1,1,195.75,60L224,85.8V56a8,8,0,1,1,16,0Z" /></svg>
                  </button>
                </div>
              </div>

              <slot :name="selectedTab + 'Form'" />
            </div>
          </div>
        </div>

        <collapse :when="isDetailsVisible" class="transition-height">
          <div class="flex rounded-[14px] bg-slate-100 mt-5 p-4 sm:p-5 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 flex-col">
            <div class="flex flex-1 justify-between gap-x-4 sm:mx-5 my-3">
              <slot name="buttons" />
            </div>

            <slot name="stats" />
          </div>
        </collapse>
      </div>

      <div class="flex w-full flex-col gap-7.5 mt-8 text-sm text-slate-500 gap-y-4">
        <div class="font-bold">This is the homepage of DND (Delta-neutral Dividend) project</div>

        <div>
          DND maintains a profitable delta-neutral dollar value position using staked ETH.
        </div>

        <div>
          Think of it not as an algorithmic or centralized stablecoin, but as a completely on-chain synthetic dollar. You can put in staked version of ETH but see
          your balance in USD and take out USDC.
        </div>

        <div>
          Delta-neutral Dividend is using the Aave protocol to hedge and maintain the neutral value of the user's position. No matter where the market price of ETH goes —
          the position value will remain the same while farming staking rewards.
        </div>

        <div class="text-slate-400 italic">
          Disclaimer: the service is in beta and should be used on your own risk.
        </div>
      </div>
    </div>
  </centered-layout>
</template>

<script setup>
import { useWallet } from '@/useWallet';
import { shallowRef } from 'vue';
import { Collapse } from 'vue-collapsed';
import CenteredLayout from './CenteredLayout.vue';
import PopoverInfo from './PopoverInfo.vue';
import PopoverApyBase from './PopoverApyBase.vue';

const { chainId } = useWallet();

defineProps({
  balance: {
    type: String,
    default: null
  },
  apy: {
    type: [ Number, null ],
    required: true
  },
  apyDetails: {
    type: [ Array, null ],
    required: true
  }
});

const isDetailsVisible = shallowRef(false);
const selectedTab = shallowRef('deposit');
</script>
