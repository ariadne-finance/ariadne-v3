<template>
  <loading-spinner v-if="!isReady"> Loading... </loading-spinner>

  <centered-layout v-else>
    <div class="flex justify-center items-center text-left">
      <div class="py-10">
        <div class="mb-8">
          <the-logo />
        </div>

        <form class="w-full max-w-[400px] mt-8" @submit.prevent="deposit">
          <currency-input-withdraw
            ref="depositInput"
            v-model="depositAmount"
            v-model:selectedWithdrawToken="selectedDepositToken"
            :decimals="selectedDepositTokenDecimals"
            :display-decimals="4"
            :max="selectedDepositTokenBalanceOrEth"
            :disabled="isMetamaskBusy"
            :tokens="depositTokenSymbolList"
            placeholder=""
            class="grow mt-4"
          />

          <a class="font-semibold link-dashed text-slate-400" @click="depositMaxClicked">
            max {{ selectedDepositTokenBalanceOrEthHr }} {{ selectedDepositToken }}
          </a>

          <button-submit class="w-full mt-8" :disabled="!isDepositButtonEnabled || isMetamaskBusy" :busy="isMetamaskBusy">Deposit</button-submit>
        </form>
      </div>
    </div>
  </centered-layout>
</template>

<script setup>
import TheLogo from './TheLogo.vue';
import TheSpinner from './TheSpinner.vue';
import CenteredLayout from '@/components/CenteredLayout.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import ButtonSubmit from '@/components/ButtonSubmit.vue';
import { shallowRef, computed, toValue, watch, ref } from 'vue';
import { formatContractUnits, formatUnits } from '@/formatters';
import { useCollector } from '@/useCollector';
import { useERC20Balance } from '@/useERC20Balance';
import { snapTo100Percent } from '@/snapTo100Percent';
import CurrencyInputWithdraw from '@/components/CurrencyInputWithdraw.vue';
import { useWallet } from '@/useWallet';
import { ethers } from 'ethers';

const DEPOSIT_LABEL_DEPOSITING = 'Depositing...';
const DEPOSIT_LABEL_WRAPPING = 'Wrapping...';
const DEPOSIT_LABEL_CONFIRMING = 'Confirming...';
const DEPOSIT_LABEL_SUCCESS = 'Success!';

const isMetamaskBusy = shallowRef(false);

const { address, provider, signer } = useWallet();

const depositInput = ref(null);
const depositAmount = shallowRef(null);

const selectedDepositToken = shallowRef(null);

const {
  isReady: isCollectorReady,
  refetch: refetchCollector,
  tokenContracts,
  isLookupDone,
  contract: collectorContract
} = useCollector();

const wethContract = computed(() => {
  if (!isLookupDone.value) {
    return null;
  }

  return tokenContracts.value.find(c => toValue(c).erc20.symbol === 'WETH');
});

const selectedDepositTokenContract = computed(() => {
  const tokenToSearch = toValue(selectedDepositToken) === 'ETH' ? 'WETH' : toValue(selectedDepositToken);
  return tokenContracts.value.find(c => c.erc20?.symbol === tokenToSearch);
});

const selectedDepositTokenDecimals = computed(() => {
  if (selectedDepositTokenContract.value?.erc20) {
    return selectedDepositTokenContract.value.erc20.decimals;
  }

  if (selectedDepositToken.value === 'ETH') {
    return 18;
  }

  return null;
});

const {
  balance: selectedDepositTokenBalance,
  isReady: isSelectedDepositTokenBalanceReady,
  refetch: refetchSelectedDepositTokenBalance
} = useERC20Balance(selectedDepositTokenContract, address);

const isSelectedDepositTokenOrEthBalanceReady = computed(() => isSelectedDepositTokenBalanceReady.value || toValue(selectedDepositToken) === 'ETH');

watch(isLookupDone, isDone => {
  if (!isDone) {
    selectedDepositToken.value = null;
    return;
  }

  selectedDepositToken.value = toValue(tokenContracts.value[0]).erc20.symbol;
});

watch(selectedDepositToken, async (newSelectedDepositToken, oldSelectedDepositToken) => {
  // do not reset anything if we're just setting it
  if (oldSelectedDepositToken === null) {
    return;
  }

  depositInput.value.reset();
  depositAmount.value = null;
});

const ethBalance = shallowRef(null);

async function loadEthBalance() {
  ethBalance.value = await provider.value.getBalance(address.value);
}

loadEthBalance();

const isDepositTokenETH = computed(() => (toValue(selectedDepositToken) || '').toLowerCase() === 'eth');

const selectedDepositTokenBalanceOrEth = computed(() => {
  if (toValue(isDepositTokenETH)) {
    return ethBalance.value;
  }

  return selectedDepositTokenBalance.value;
});

const selectedDepositTokenBalanceOrEthHr = computed(() => {
  if (toValue(isDepositTokenETH)) {
    return formatContractUnits(ethBalance.value, wethContract.value, 4, 4);
  }

  return formatContractUnits(selectedDepositTokenBalance.value, selectedDepositTokenContract.value, 4, 4);
});

const isReady = computed(
  () => toValue(isCollectorReady)
  && toValue(isLookupDone)
  && toValue(isSelectedDepositTokenOrEthBalanceReady)
);

const depositTokenSymbolList = computed(() => {
  if (!isLookupDone.value) {
    return [];
  }

  const list = tokenContracts.value.map(c => c.erc20?.symbol);
  list.unshift('ETH');
  return list;
});

const isDepositButtonEnabled = computed(() => {
  if (toValue(depositAmount) <= 0n) {
    return false;
  }

  if (toValue(isDepositTokenETH)) {
    return toValue(ethBalance) >= toValue(depositAmount);
  }

  return toValue(depositAmount) <= toValue(selectedDepositTokenBalance);
});

function depositMaxClicked() {
  if (isDepositTokenETH.value) {
    depositAmount.value = ethBalance.value;

  } else if (!selectedDepositTokenBalance.value) {
    return;

  } else {
    depositAmount.value = toValue(selectedDepositTokenBalanceOrEth);
  }

  toValue(depositInput).setValue(toValue(depositAmount));
}

const isRefetching = shallowRef(false);

async function refetch() {
  const startedAt = Date.now();

  isRefetching.value = true;

  await Promise.all([
    refetchCollector(),
    refetchSelectedDepositTokenBalance(),
    loadEthBalance()
    // note: we do not reload server-side balance, because that's called by deposit() function
  ]);

  if (Date.now() - startedAt <= 2000) {
    setTimeout(() => isRefetching.value = false, 1000);

  } else {
    isRefetching.value = false;
  }
}

async function deposit() {
  const amountSnapped = toValue(isDepositTokenETH)
    ? toValue(depositAmount)
    : snapTo100Percent(toValue(depositAmount), toValue(selectedDepositTokenBalanceOrEth));

  isMetamaskBusy.value = true;

  if (toValue(isDepositTokenETH)) {
    const wethContractWithDeposit = new ethers.Contract(await toValue(wethContract).getAddress(), [ 'function deposit() external payable' ], toValue(provider));

    try {
      const tr = await toValue(wethContractWithDeposit)
        .connect(toValue(signer))
        .deposit({ value: toValue(amountSnapped) });
      await tr.wait(2);

    } catch (error) {
      isMetamaskBusy.value = false;

      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        // user rejected
        return;
      }

      console.error(error);
      await alert('Error wrapping, see console for actual error');

      return;
    }
  }

  let tr;

  try {
    tr = await toValue(selectedDepositTokenContract).connect(toValue(signer)).transfer(await toValue(collectorContract).getAddress(), amountSnapped);

  } catch (error) {
    isMetamaskBusy.value = false;

    if (error.message.includes('DND-10')) { // FIXME errors
      await alert("This token cannot be deposited");
      return;
    }

    if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
      // user rejected
      return;
    }

    console.error(error);
    await alert('Error depositing, see console for actual error');

    return;
  }

  try {
    await tr.wait(4);

  } catch (error) {
    console.error(error);
    await alert('Error confirming deposit, see console for actual error');
  }

  isMetamaskBusy.value = false;
  depositInput.value.reset();
  depositAmount.value = null;

  refetch(); // fire-and-forget

  reloadTotalUserBalance(tr.hash); // fire-and-forget
}
</script>

<style scoped>
.busy {
  pointer-events: none;
}
</style>
