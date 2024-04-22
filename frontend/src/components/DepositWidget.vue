<template>
  <loading-spinner v-if="!isReady" class="text-primary-500"> Loading... </loading-spinner>

  <centered-layout v-else>
    <div class="my-10 lg:mt-0 mx-2">
      <block-decorative class="max-w-[590px] lg:max-w-[1181px]">
        This vault leverages sDAI by borrowing xDai on Aave. You are only exposed to sDAI and xDai risk.
        Click on the <span class="text-nowrap">[i]</span> link next to the current APY number to learn
        how it is calculated. Please check out our Telegram group at the bottom of the page if
        you have any questions.
      </block-decorative>
    </div>

    <div class="border-2 border-primary-400 shadow-custom">
      <div class="bg-black/10 border-b-2 border-primary-400 flex items-center p-4 flex-col sm:flex-row sm:justify-between sm:space-x-8">
        <div class="mb-2 sm:-my-4">
          <img src="/coins/dai-bg.png" class="size-8 inline-block rounded-full border-2 border-primary-400" alt="dai">
          <img src="/coins/agave-bg.png" class="size-8 inline-block rounded-full border-2 border-primary-400 relative -left-2" alt="agave">
        </div>

        <div class="text-xl">
          sDAI/wxDai leveraged farm
        </div>
        <div class="text-xl">
          <span class="text-primary-400">APY:</span>
          {{ apyHr }}
          <button class="btn-link px-0 hover:text-primary-100" @click="showApyModal">[i]</button>
        </div>
      </div>

      <div class="px-4 py-6 text-center">
        <template v-if="asdaiBalanceAsWxdai > 0">
          <span class="text-primary-400">Your balance:</span> {{ asdaiBalanceAsWxdaiHr }} wxDai
        </template>
        <template v-else>
          You have no power here
        </template>
      </div>

      <div class="flex flex-col space-y-1 lg:flex-row lg:space-x-1 lg:space-y-0 m-1">
        <form class="w-full max-w-[600px] border-2 border-primary-400 pb-4" @submit.prevent="depositClicked">
          <div class="mt-4 text-center p-2 text-xl">DEPOSIT</div>
          <div class="flex flex-col sm:flex-row items-start space-x-1 m-4">
            <div class="grow">
              <currency-input-withdraw
                ref="depositInput"
                v-model="depositAmount"
                v-model:selectedWithdrawToken="selectedDepositToken"
                :decimals="18"
                :display-decimals="4"
                :max="selectedDepositTokenBalanceOrNative"
                :min="settings.minDepositAmount"
                :disabled="isMetamaskBusy"
                :tokens="depositTokenSymbolList"
                placeholder=""
              />
              <div class="flex flex-col xs:flex-row justify-between">
                <a class="font-semibold link-dashed text-primary-300" @click="depositMaxClicked">
                  max {{ selectedDepositTokenBalanceOrNativeHr }} {{ selectedDepositToken }}
                </a>

                <a class="font-semibold link-dashed text-primary-300" @click="depositMinClicked">
                  min {{ formatUnits(settings.minDepositAmount, 18, 4, 4) }} {{ selectedDepositToken }}
                </a>
              </div>
            </div>

            <div class="shrink-0 w-full sm:w-auto text-center mt-6 sm:mt-0">
              <button-submit :disabled="!isDepositButtonEnabled || isMetamaskBusy" :busy="isMetamaskBusy">Deposit</button-submit>
            </div>
          </div>
        </form>

        <form class="w-full max-w-[600px] border-2 border-primary-400 pb-4" @submit.prevent="withdrawClicked">
          <div class="mt-4 text-center p-2 text-xl">WITHDRAW</div>
          <div class="flex flex-col sm:flex-row items-start space-x-1 m-4">
            <div class="grow">
              <currency-input-withdraw
                ref="withdrawInput"
                v-model="withdrawAmount"
                v-model:selectedWithdrawToken="selectedWithdrawToken"
                :decimals="18"
                :display-decimals="4"
                :max="asdaiBalanceAsWxdai"
                :disabled="isMetamaskBusy"
                :tokens="['wxDai']"
                placeholder=""
              />

              <a class="font-semibold link-dashed text-primary-300" @click="withdrawMaxClicked">
                max {{ asdaiBalanceAsWxdaiHr }} wxDai
              </a>
            </div>

            <div class="shrink-0 w-full sm:w-auto text-center mt-6 sm:mt-0">
              <button-submit :disabled="!isWithdrawButtonEnabled || isMetamaskBusy" :busy="isMetamaskBusy">Withdraw</button-submit>
            </div>
          </div>
        </form>
      </div>
    </div>
  </centered-layout>
</template>

<script setup>
/* eslint-disable no-await-in-loop, no-promise-executor-return */

import CenteredLayout from '@/components/CenteredLayout.vue';
import BlockDecorative from './BlockDecorative.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import ButtonSubmit from '@/components/ButtonSubmit.vue';
import { shallowRef, computed, toValue, watch, ref } from 'vue';
import { formatUnits } from '@/formatters';
import { useERC20Balance } from '@/useERC20Balance';
import { snapTo100Percent } from '@/snapTo100Percent';
import CurrencyInputWithdraw from '@/components/CurrencyInputWithdraw.vue';
import { useWallet } from '@/useWallet';
import { useAsdai } from '@/useAsdai';
import { apy, apyHr, loadApy } from '@/apy';
import { decodeError, DEPOSIT_ERROR_MESSAGE_BY_ASDAI_CUSTOM_ERROR, WITHDRAW_ERROR_MESSAGE_BY_ASDAI_CUSTOM_ERROR, isMetamaskRejected } from '@/asdaiErrors';
import { Modal, DepositModal, WithdrawModal } from '@/useModal';
import ModalApy from '@/components/ModalApy.vue';

const isMetamaskBusy = shallowRef(false);

const { address, provider, signer } = useWallet();

const depositInput = ref(null);
const depositAmount = shallowRef(null);

const withdrawInput = ref(null);
const withdrawAmount = shallowRef(null);

const selectedDepositToken = shallowRef('wxDai');
const selectedWithdrawToken = shallowRef('wxDai');

const {
  isReady: isAsdaiReady,
  refetch: refetchAsdai,
  asdaiContract,
  wxdaiContract,
  wxdaiPrice,
  settings
} = useAsdai();

const nativeBalance = shallowRef(null);

async function loadNativeBalance() {
  nativeBalance.value = await provider.value.getBalance(address.value);
}

loadNativeBalance();

const isDepositTokenNativeCurrency = computed(() => (toValue(selectedDepositToken) || '').toLowerCase() === 'xdai');

const selectedDepositTokenBalanceOrNative = computed(() => {
  if (toValue(isDepositTokenNativeCurrency)) {
    return nativeBalance.value;
  }

  return wxdaiBalance.value;
});

const selectedDepositTokenBalanceOrNativeHr = computed(() => (
  selectedDepositTokenBalanceOrNative.value === null
    ? '...'
    : formatUnits(selectedDepositTokenBalanceOrNative.value, 18, 4, 4)
));

watch(selectedDepositToken, async (newSelectedDepositToken, oldSelectedDepositToken) => {
  // do not reset anything if we're just setting it
  if (oldSelectedDepositToken === null) {
    return;
  }

  depositInput.value.reset();
  depositAmount.value = null;
});

const isReady = computed(
  () => toValue(isAsdaiReady)
    && toValue(isWxdaiBalanceReady)
    && toValue(nativeBalance) !== null
    && toValue(isAsdaiBalanceReady)
);

const depositTokenSymbolList = [ 'xDai', 'wxDai' ];

const isDepositButtonEnabled = computed(() => {
  if (toValue(depositAmount) < toValue(settings).minDepositAmount) {
    return false;
  }

  if (toValue(isDepositTokenNativeCurrency)) {
    return toValue(depositAmount) <= toValue(nativeBalance);
  }

  return toValue(depositAmount) <= toValue(wxdaiBalance);
});

const isWithdrawButtonEnabled = computed(() => toValue(withdrawAmount) > 0n && toValue(withdrawAmount) <= toValue(asdaiBalanceAsWxdai));

function depositMaxClicked() {
  let amount = toValue(selectedDepositTokenBalanceOrNative);
  if (amount > toValue(settings).maxDepositAmount) {
    amount = toValue(settings).maxDepositAmount;
  }

  depositAmount.value = amount;
  toValue(depositInput).setValue(toValue(depositAmount));
}

function depositMinClicked() {
  depositAmount.value = toValue(settings).minDepositAmount;
  toValue(depositInput).setValue(toValue(depositAmount));
}

function withdrawMaxClicked() {
  withdrawAmount.value = toValue(asdaiBalanceAsWxdai);
  toValue(withdrawInput).setValue(toValue(withdrawAmount));
}

const {
  balance: wxdaiBalance,
  isReady: isWxdaiBalanceReady,
  refetch: refetchWxdaiBalance
} = useERC20Balance(wxdaiContract, address);

const {
  balance: asdaiBalance,
  isReady: isAsdaiBalanceReady,
  refetch: refetchAsdaiBalance
} = useERC20Balance(asdaiContract, address);

const asdaiBalanceAsWxdai = computed(() => {
  if (isAsdaiReady.value === false || isAsdaiBalanceReady.value === false) {
    return null;
  }

  return convertAsdaiToWxdai(toValue(asdaiBalance));
});

function convertAsdaiToWxdai(amount) {
  if (!toValue(settings).totalSupply) {
    return 0n;
  }

  const percent = amount * 10n ** 18n / toValue(settings).totalSupply;
  const amountBase1 = toValue(settings).totalBalanceBase * percent;
  return amountBase1 * toValue(wxdaiPrice) / 10n ** 16n;
}

function convertWxdaiToAsdai(amount) {
  if (!toValue(settings).totalBalanceBase) {
    return 0n;
  }

  const percent = amount * toValue(wxdaiPrice) * 10n ** 18n / toValue(settings).totalBalanceBase;
  return percent * toValue(settings).totalSupply / 10n ** 18n / 10n ** 18n;
}

const asdaiBalanceAsWxdaiHr = computed(() => {
  if (asdaiBalanceAsWxdai.value === null) {
    return '...';
  }

  return formatUnits(asdaiBalanceAsWxdai.value, 18, 4, 4);
});

const isRefetching = shallowRef(false);

async function refetch() {
  const startedAt = Date.now();

  isRefetching.value = true;

  await Promise.all([
    refetchAsdai(),
    loadNativeBalance(),
    refetchWxdaiBalance(),
    refetchAsdaiBalance()
  ]);

  loadApy(); // out of sync

  if (Date.now() - startedAt <= 2000) {
    setTimeout(() => isRefetching.value = false, 1000);

  } else {
    isRefetching.value = false;
  }
}

async function estimateGas(callback, onError) {
  let c = 0;
  let gasLimit = null;

  do {
    try {
      gasLimit = await callback();
      break; // once we have estimation

    } catch (error) {
      console.error(error);

      if (++c >= 3) {
        closeModalAndMetamaskIsFree();
        onError(error);
        return null;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } while (!gasLimit); // might as well be `true`

  console.log("Estimated gas", '0x' + gasLimit.toString(16));

  return gasLimit * 130n / 100n;
}

async function withdrawClicked() {
  isMetamaskBusy.value = true;

  WithdrawModal.open([
    'Withdrawing...',
    'Success!'
  ]);

  const amountInAsdai = convertWxdaiToAsdai(toValue(withdrawAmount));
  const amountSnapped = snapTo100Percent(toValue(amountInAsdai), toValue(asdaiBalance));

  let tr;

  let c = 0;
  let gasLimit;

  do {
    try {
      gasLimit = await toValue(asdaiContract).connect(toValue(signer)).withdraw.estimateGas(amountSnapped);
      break; // once we have estimation

    } catch (error) {
      const decodedError = decodeError(toValue(asdaiContract), error);
      // if this is Asdai contract error then it's definitely valid, return immediately
      if (decodedError) {
        closeModalAndMetamaskIsFree();
        Modal.error(WITHDRAW_ERROR_MESSAGE_BY_ASDAI_CUSTOM_ERROR[decodedError.name] || "(unknown error)");
        return;
      }

      console.error(error);

      if (++c >= 3) {
        closeModalAndMetamaskIsFree();
        // FIXME detailed error
        Modal.error("Error estimating gas for withdrawal, try again later." + error.message);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } while (!gasLimit); // might as well be `true`

  gasLimit = gasLimit * 130n / 100n;

  try {
    tr = await toValue(asdaiContract).connect(toValue(signer)).withdraw(amountSnapped, { gasLimit });

  } catch (error) {
    closeModalAndMetamaskIsFree();

    if (isMetamaskRejected(error)) {
      return;
    }

    console.error(error);

    const decodedError = decodeError(toValue(asdaiContract), error);
    if (decodedError) {
      Modal.error(WITHDRAW_ERROR_MESSAGE_BY_ASDAI_CUSTOM_ERROR[decodedError.name] || "(unknown error)");
    } else {
      Modal.error("Error withdrawing.");
    }

    return;
  }

  let transactionResponse;

  try {
    transactionResponse = await tr.wait(4);

  } catch (error) {
    console.error(error);
    Modal.error("Error confirming withdrawal.");
  }

  closeModalAndMetamaskIsFree();

  withdrawInput.value.reset();
  withdrawAmount.value = null;

  refetch(); // fire-and-forget

  if (!transactionResponse) {
    return;
  }

  const event = transactionResponse.logs.find(a => a.eventName === 'PositionWithdraw');

  if (!event) {
    Modal.error("Withdrawal event not found in transaction receipt");
    return;
  }

  Modal.alert({
    title: "Success!",
    body: `Withdrawn ${formatUnits(event.args?.amountWxdai, 18, 4, 4)} wxDai`
  });
}

async function depositClicked() {
  const amountSnapped = toValue(isDepositTokenNativeCurrency)
    ? toValue(depositAmount)
    : snapTo100Percent(toValue(depositAmount), toValue(selectedDepositTokenBalanceOrNative));

  isMetamaskBusy.value = true;

  const steps = [];

  if (toValue(isDepositTokenNativeCurrency)) {
    steps.push('Wrapping xDai...');
  }

  const allowance = await toValue(wxdaiContract).allowance(address.value, toValue(asdaiContract).address);
  if (allowance < amountSnapped) {
    steps.push('Approving...');
  }

  steps.push('Depositing...');
  steps.push('Success!');

  DepositModal.open(steps);

  let tr;
  let gasLimit;

  if (toValue(isDepositTokenNativeCurrency)) {
    gasLimit = await estimateGas(
      () => toValue(wxdaiContract).connect(toValue(signer)).deposit.estimateGas({ value: toValue(amountSnapped) }),
      () => Modal.error("Error estimating gas for wrapping, try again later.")
    );

    if (!gasLimit) {
      return;
    }

    try {
      tr = await toValue(wxdaiContract).connect(toValue(signer)).deposit({ value: toValue(amountSnapped), gasLimit });

    } catch (error) {
      closeModalAndMetamaskIsFree();

      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        // user rejected
        return;
      }

      console.error(error);
      Modal.error("Error wrapping xDai into wxDai!");
      return;
    }

    DepositModal.nextStep();
  }

  if (allowance < amountSnapped) {
    gasLimit = await estimateGas(
      () => toValue(wxdaiContract).connect(toValue(signer)).approve.estimateGas(toValue(asdaiContract).address, amountSnapped),
      () => Modal.error("Error estimating gas for approval, try again later.")
    );

    if (!gasLimit) {
      return;
    }

    try {
      tr = await toValue(wxdaiContract).connect(toValue(signer)).approve(toValue(asdaiContract).address, amountSnapped, { gasLimit });

    } catch (error) {
      closeModalAndMetamaskIsFree();

      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        // user rejected
        return;
      }

      console.error(error);
      Modal.error("Error approving wxDai.");
      return;
    }

    try {
      tr.wait(1);
    } catch {
      // ignored
    }

    DepositModal.nextStep();
  }

  let c = 0;

  do {
    try {
      gasLimit = await toValue(asdaiContract).connect(toValue(signer)).deposit.estimateGas(amountSnapped);
      break; // once we have estimation

    } catch (error) {
      const decodedError = decodeError(toValue(asdaiContract), error);
      // if this is Asdai contract error then it's definitely valid, return immediately
      if (decodedError) {
        closeModalAndMetamaskIsFree();
        Modal.error(DEPOSIT_ERROR_MESSAGE_BY_ASDAI_CUSTOM_ERROR[decodedError.name] || "(unknown error)");
        return;
      }

      console.error(error);

      if (++c >= 3) {
        closeModalAndMetamaskIsFree();
        // FIXME detailed error
        Modal.error("Error estimating gas for deposit, try again later." + error.message);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } while (!gasLimit); // might as well be `true`

  gasLimit = gasLimit * 130n / 100n;

  try {
    tr = await toValue(asdaiContract).connect(toValue(signer)).deposit(amountSnapped, { gasLimit });

  } catch (error) {
    closeModalAndMetamaskIsFree();

    if (isMetamaskRejected(error)) {
      return;
    }

    console.error(error);

    const decodedError = decodeError(toValue(asdaiContract), error);
    if (decodedError) {
      Modal.error(DEPOSIT_ERROR_MESSAGE_BY_ASDAI_CUSTOM_ERROR[decodedError.name] || "(unknown error)");
    } else {
      Modal.error("Error depositing.");
    }

    return;
  }

  let transactionResponse;

  try {
    transactionResponse = await tr.wait(4);

  } catch (error) {
    console.error(error);
    Modal.error("Error confirming deposit.");
    // do not return
  }

  closeModalAndMetamaskIsFree();

  depositInput.value.reset();
  depositAmount.value = null;

  refetch(); // fire-and-forget

  if (!transactionResponse) {
    return;
  }

  const event = transactionResponse.logs.find(a => a.eventName === 'PositionDeposit');

  if (!event) {
    Modal.error("Deposit event not found in transaction receipt");
    return;
  }

  Modal.alert({
    title: "Success!",
    body: `Deposited ${formatUnits(event.args?.amountWxdai, 18, 4, 4)} wxDai`
  });
}

function showApyModal() {
  Modal.alert({
    title: 'APY Info',
    component: ModalApy,
    componentData: { apy: apy.value },
    okButton: 'Okay, thanks'
  });
}

function closeModalAndMetamaskIsFree() {
  DepositModal.close();
  isMetamaskBusy.value = false;
}
</script>

<style scoped>
.busy {
  pointer-events: none;
}
</style>
