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
import * as Sentry from '@sentry/vue';
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
import { useOnboard } from '@web3-onboard/vue';
import { useAsdai } from '@/useAsdai';
import { apy, apyHr, loadApy } from '@/apy';
import { decodeError, ERROR_MESSAGE_BY_ASDAI_CUSTOM_ERROR, isMetamaskRejected, isMetamaskMissingRorV } from '@/asdaiErrors';
import { waitForTransactionReceipt, parseLogs } from '@/contractTools';
import { Modal, DepositModal, WithdrawModal } from '@/useModal';
import ModalDetailedError from '@/components/ModalDetailedError.vue';
import ModalApy from '@/components/ModalApy.vue';

const isMetamaskBusy = shallowRef(false);

const { address, provider, signer } = useWallet();
const { connectedWallet } = useOnboard();

const ethereumProvider = toValue(connectedWallet).provider; // already existing by the time DepositWidget is loaded

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

async function estimateGas(operation, callback, onError) {
  let c = 0;
  let gasLimit = null;

  do {
    try {
      gasLimit = await callback();
      break; // once we have estimation

    } catch (error) {
      console.error(error);

      if (++c >= 3) {
        Sentry.captureException(error, {
          tags: {
            operation,
            step: 'estimateGas'
          },
          extra: {
            message: error.message
          }
        });

        closeModalAndMetamaskIsFree();

        onError(error);

        return null;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } while (!gasLimit); // might as well be `true`

  return calculateProperGaslimit(gasLimit);
}

function possibleDecodeAndReportMessageInError({ operation, step, error }) {
  if (!error.data?.message) {
    return false;
  }

  Sentry.captureMessage(error.data.message, {
    tags: {
      operation,
      step
    }
  });

  closeModalAndMetamaskIsFree();

  Modal.error('(' + error.data.message + ')');

  return true;
}

function possiblyDecodeAndReportAsdaiError({ operation, step, error }) {
  const decodedError = decodeError(toValue(asdaiContract), error);
  if (!decodedError) {
    return false;
  }

  const message = ERROR_MESSAGE_BY_ASDAI_CUSTOM_ERROR[decodedError.name] || "unknown error";

  Sentry.captureMessage(message, {
    tags: {
      operation,
      step
    }
  });

  closeModalAndMetamaskIsFree();

  Modal.error('(' + message + ')');

  return true;
}

function possiblyReportIsMetamaskMissingRorV({ operation, step, error }) {
  if (!isMetamaskMissingRorV(error)) {
    return false;
  }

  Sentry.captureMessage("Missing r or v", {
    tags: {
      operation,
      step
    }
  });

  showDetailedErrorModal({
    title: "Oops",
    text: "Internal error with signature. Try again later.",
    detailsMessage: error.message
  });

  return true;
}

function captureExceptionAndShowDetailedErrorModal({ operation, step, error, message }) {
  console.error(error);

  const actualMessage = error?.data?.message || error.message || message;

  Sentry.captureException(error, {
    tags: {
      operation,
      step
    },
    extra: {
      actualMessage
    }
  });

  showDetailedErrorModal({
    title: "Oops",
    text: message,
    detailsMessage: actualMessage
  });
}

function handleError({ operation, step, error, message }) {
  closeModalAndMetamaskIsFree();

  if (isMetamaskRejected(error)) {
    return;
  }

  if (possiblyDecodeAndReportAsdaiError({ operation, step, error })) {
    return;
  }

  if (possibleDecodeAndReportMessageInError({ operation, step, error })) {
    return;
  }

  if (possiblyReportIsMetamaskMissingRorV({ operation, step, error })) {
    return;
  }

  captureExceptionAndShowDetailedErrorModal({ operation, step, error, message });
}

async function estimateGasForWithdrawViaEthers(amount) {
  let gasLimit;
  let tries = 0;

  do {
    try {
      gasLimit = await toValue(asdaiContract).connect(toValue(signer)).withdraw.estimateGas(amount);
      break; // once we have estimation

    } catch (error) {
      if (possiblyDecodeAndReportAsdaiError({ operation: 'withdraw', step: 'estimateGas', error })) {
        return null;
      }

      if (++tries >= 3) {
        captureExceptionAndShowDetailedErrorModal({
          operation: 'withdraw',
          step: 'estimateGas',
          error,
          message: "Error estimating gas for withdrawal. Try again later."
        });

        return null;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } while (!gasLimit); // might as well be `true`

  return calculateProperGaslimit(gasLimit);
}

async function withdrawViaEthers(amount) {
  const gasLimit = await estimateGasForWithdrawViaEthers(amount);
  if (!gasLimit) {
    return null;
  }

  try {
    const tr = await toValue(asdaiContract).connect(toValue(signer)).withdraw(amount, { gasLimit });
    return tr.transactionHash;

  } catch (error) {
    handleError({
      operation: 'withdraw',
      step: 'tx',
      error,
      message: "Error withdrawing. Try again later."
    });
  }

  return null;
}

async function estimateGasForWithdrawViaRawTransaction(populatedTransaction) {
  let gasLimit;
  let c = 0;

  do {
    try {
      const gasLimitString = await ethereumProvider.request({
        method: 'eth_estimateGas',
        params: [ populatedTransaction ]
      });

      gasLimit = BigInt(gasLimitString);

      break; // once we have estimation

    } catch (error) {
      if (possiblyDecodeAndReportAsdaiError({ operation: 'withdraw', step: 'estimateGas', error })) {
        return null;
      }

      console.error(error);

      if (++c >= 3) {
        captureExceptionAndShowDetailedErrorModal({
          operation: 'withdraw',
          step: 'estimateGas',
          error,
          message: "Error estimating gas for withdrawal. Try again later."
        });

        return null;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } while (!gasLimit); // might as well be `true`

  return calculateProperGaslimit(gasLimit);
}

async function withdrawViaRawTransaction(amount) {
  const populatedTransaction = await toValue(asdaiContract).withdraw.populateTransaction(amount);
  populatedTransaction.from = toValue(signer).address;

  const gasLimit = await estimateGasForWithdrawViaRawTransaction(populatedTransaction);
  if (!gasLimit) {
    return null;
  }

  populatedTransaction.gas = '0x' + gasLimit.toString(16);

  try {
    return await ethereumProvider.request({
      method: 'eth_sendTransaction',
      params: [ populatedTransaction ]
    });

  } catch (error) {
    handleError({
      operation: 'withdraw',
      step: 'tx',
      error,
      message: "Error withdrawing. Try again later."
    });
  }

  return null;
}

async function withdrawClicked() {
  isMetamaskBusy.value = true;

  WithdrawModal.open([
    'Withdrawing...'
  ]);

  const amountInAsdai = convertWxdaiToAsdai(toValue(withdrawAmount));
  const amountSnapped = snapTo100Percent(toValue(amountInAsdai), toValue(asdaiBalance));

  const transactionHash = await withdrawViaRawTransaction(amountSnapped);
  if (!transactionHash) {
    return;
  }

  const transactionReceipt = await waitForTransactionReceipt({
    provider: ethereumProvider,
    transactionHash
  });

  closeModalAndMetamaskIsFree();

  if (!transactionReceipt) {
    Modal.alert({
      title: "Well...",
      body: "Transaction went through, but we were unable to confirm it. Please check your wallet in a sec."
    });

    return;
  }

  withdrawInput.value.reset();
  withdrawAmount.value = null;

  processShowMainTransactionSuccessOrPartialSuccess({
    transactionReceipt,
    eventName: 'PositionWithdraw',
    operation: 'withdraw',
    formatSuccessMessage: amount => `Withdrawn ${formatUnits(amount, 18, 4, 4)} wxDai`
  });
}

async function wrapViaEthers(amount) {
  const gasLimit = await estimateGas(
    'wrap',
    () => toValue(wxdaiContract).connect(toValue(signer)).deposit.estimateGas({ value: amount }),
    error => showDetailedErrorModal({
      title: "Oops",
      text: "Error estimating gas for wrapping. Try again later.",
      detailsMessage: error.message
    })
  );

  if (!gasLimit) {
    return false;
  }

  try {
    await toValue(wxdaiContract).connect(toValue(signer)).deposit({ value: amount, gasLimit });

  } catch (error) {
    handleError({
      operation: 'wrap',
      step: 'tx',
      error,
      message: "Error wrapping xDai into wxDai. Try again later."
    });

    return false;
  }

  return true;
}

async function wrapViaRawTransaction(amount) {
  const populatedTransaction = await toValue(wxdaiContract).deposit.populateTransaction({ value: amount });
  populatedTransaction.from = toValue(signer).address;
  populatedTransaction.value = '0x' + populatedTransaction.value.toString(16);

  let transactionHash;

  try {
    transactionHash = await ethereumProvider.request({
      method: 'eth_sendTransaction',
      params: [ populatedTransaction ]
    });

  } catch (error) {
    handleError({
      operation: 'wrap',
      step: 'tx',
      error,
      message: "Error wrapping xDai into wxDai. Try again later."
    });

    return false;
  }

  const transactionReceipt = await waitForTransactionReceipt({
    provider: ethereumProvider,
    transactionHash,
    timeoutMs: 30 * 1000
  });

  if (!transactionReceipt) {
    Modal.error("Failed to wait for wrapping transaction to mine. Try again later.");
    return false;
  }

  return true;
}

async function approveViaEthers(amount) {
  try {
    await toValue(wxdaiContract).connect(toValue(signer)).approve(toValue(asdaiContract).address, amount);

  } catch (error) {
    handleError({
      operation: 'approve',
      step: 'tx',
      error,
      message: "Error approving wxDai. Try again later."
    });

    return false;
  }

  return true;
}

async function approveViaRawTransaction(amount) {
  const populatedTransaction = await toValue(wxdaiContract).approve.populateTransaction(toValue(asdaiContract).address, amount);
  populatedTransaction.from = toValue(signer).address;

  let transactionHash;

  try {
    transactionHash = await ethereumProvider.request({
      method: 'eth_sendTransaction',
      params: [ populatedTransaction ]
    });

  } catch (error) {
    handleError({
      operation: 'approve',
      step: 'tx',
      error,
      message: "Error approving wxDai. Try again later."
    });

    return false;
  }

  const transactionReceipt = await waitForTransactionReceipt({
    provider: ethereumProvider,
    transactionHash,
    timeoutMs: 30 * 1000
  });

  if (!transactionReceipt) {
    Modal.error("Failed to wait for approval transaction to mine. Try again later.");
    return false;
  }

  return true;
}

async function estimateGasForDepositViaRawTransaction(populatedTransaction) {
  let gasLimit;
  let tries = 0;

  do {
    try {
      const gasLimitString = await ethereumProvider.request({
        method: 'eth_estimateGas',
        params: [ populatedTransaction ]
      });

      gasLimit = BigInt(gasLimitString);

      break; // once we have estimation

    } catch (error) {
      if (possiblyDecodeAndReportAsdaiError({ operation: 'deposit', step: 'estimateGas', error })) {
        return null;
      }

      console.error(error);

      if (++tries >= 3) {
        captureExceptionAndShowDetailedErrorModal({
          operation: 'deposit',
          step: 'estimateGas',
          error,
          message: "Error estimating gas for deposit. Try again later."
        });

        return null;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } while (!gasLimit); // might as well be `true`

  return calculateProperGaslimit(gasLimit);
}

async function depositViaRawTransaction(amount) {
  const populatedTransaction = await toValue(asdaiContract).deposit.populateTransaction(amount);
  populatedTransaction.from = toValue(signer).address;

  // we need to estimate gas in order to catch errors
  const gasLimit = await estimateGasForDepositViaRawTransaction(populatedTransaction);
  if (!gasLimit) {
    return null;
  }

  populatedTransaction.gas = '0x' + gasLimit.toString(16);

  try {
    return await ethereumProvider.request({
      method: 'eth_sendTransaction',
      params: [ populatedTransaction ]
    });

  } catch (error) {
    handleError({
      operation: 'deposit',
      step: 'tx',
      error,
      message: "Error depositing. Try again later."
    });
  }

  return null;
}

async function estimateGasForDepositViaEthers(amount) {
  let tries = 0;
  let gasLimit;

  do {
    try {
      gasLimit = await toValue(asdaiContract).connect(toValue(signer)).deposit.estimateGas(amount);
      break; // once we have estimation

    } catch (error) {
      if (possiblyDecodeAndReportAsdaiError({ operation: 'deposit', step: 'estimateGas', error })) {
        return null;
      }

      console.error(error);

      if (++tries >= 3) {
        captureExceptionAndShowDetailedErrorModal({
          operation: 'deposit',
          step: 'estimateGas',
          error,
          message: "Error estimating gas for deposit. Try again later."
        });

        return null;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } while (!gasLimit); // might as well be `true`

  return calculateProperGaslimit(gasLimit);
}

async function depositViaEthers(amount) {
  const gasLimit = await estimateGasForDepositViaEthers(amount);
  if (!gasLimit) {
    return null;
  }

  try {
    const tr = await toValue(asdaiContract).connect(toValue(signer)).deposit(amount, { gasLimit });
    return tr.transactionHash;

  } catch (error) {
    handleError({
      operation: 'deposit',
      step: 'tx',
      error,
      message: "Error depositing. Try again later."
    });
  }

  return null;
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

  DepositModal.open(steps);

  if (toValue(isDepositTokenNativeCurrency)) {
    const shouldContinue = await wrapViaRawTransaction(amountSnapped);
    if (!shouldContinue) {
      return;
    }

    DepositModal.nextStep();
  }

  if (allowance < amountSnapped) {
    const shouldContinue = await approveViaRawTransaction(amountSnapped);
    if (!shouldContinue) {
      return;
    }

    DepositModal.nextStep();
  }

  const transactionHash = await depositViaRawTransaction(amountSnapped);
  if (!transactionHash) {
    return;
  }

  const transactionReceipt = await waitForTransactionReceipt({
    provider: ethereumProvider,
    transactionHash
  });

  closeModalAndMetamaskIsFree();

  if (!transactionReceipt) {
    Modal.alert({
      title: "Well...",
      body: "Transaction went through, but we were unable to confirm it. Please check your wallet in a sec."
    });

    return;
  }

  depositInput.value.reset();
  depositAmount.value = null;

  processShowMainTransactionSuccessOrPartialSuccess({
    transactionReceipt,
    eventName: 'PositionDeposit',
    operation: 'deposit',
    formatSuccessMessage: amount => `Deposited ${formatUnits(amount, 18, 4, 4)} wxDai`
  });
}

async function processShowMainTransactionSuccessOrPartialSuccess({
  transactionReceipt,
  eventName,
  operation,
  formatSuccessMessage
}) {
  refetch(); // fire-and-forget

  const logs = parseLogs({
    transactionReceipt,
    contractInterface: toValue(asdaiContract).interface
  });

  const event = logs.find(a => a.name === eventName);

  if (!event) {
    const message = eventName + " event not found in transaction receipt. Please check your wallet in a sec.";

    const scope = new Sentry.Scope();
    scope.setTag('operation', operation);
    scope.setTag('step', 'parse');
    scope.setContext('transactionResponseLogs', { logs });
    scope.setExtra('transactionResponseLogsLength', logs?.length);
    Sentry.captureMessage(message, scope);

    Modal.error(message);

    return;
  }

  Modal.alert({
    title: "Success!",
    body: formatSuccessMessage(event.args?.amountWxdai)
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

function showDetailedErrorModal({ title, text, detailsMessage }) {
  closeModalAndMetamaskIsFree();

  Modal.dialog({
    title,
    component: ModalDetailedError,
    componentData: {
      text,
      detailsMessage
    },
    cancelButton: false
  });
}

function closeModalAndMetamaskIsFree() {
  WithdrawModal.close();
  DepositModal.close();
  isMetamaskBusy.value = false;
}

function calculateProperGaslimit(gasLimit) {
  const _gasLimit = gasLimit * 140n / 100n;

  // because sometimes a ridiculous small number is returned, like 70_000
  return _gasLimit < 1_200_000n ? 1_200_000n : _gasLimit;
}

</script>

<style scoped>
.busy {
  pointer-events: none;
}
</style>
