<template>
  <loading-spinner v-if="!isReady" class="text-primary-500"> Loading... </loading-spinner>

  <centered-layout v-else>
    <div class="my-10 lg:mt-0 mx-2">
      <block-decorative class="max-w-[590px] lg:max-w-[1181px]">
        This vault leverages sDai borrowing xDai on Aave. You are only exposed to sDai and xDai risks. Click the “i” link
        next to the current APY to learn what it consists of. Please check out our Telegram group below if you have questions.
      </block-decorative>
    </div>

    <div class="border-2 border-primary-400 shadow-custom">
      <div class="bg-black/10 border-b-2 border-primary-400 flex items-center p-4 flex-col sm:flex-row sm:space-x-8">
        <div class="grow mb-2 sm:-my-4">
          <img src="/coins/dai-bg.png" class="size-8 inline-block rounded-full border-2 border-primary-400" alt="dai">
          <img src="/coins/agave-bg.png" class="size-8 inline-block rounded-full border-2 border-primary-400 relative -left-2" alt="agave">
        </div>

        <div class="shrink-0 text-xl">
          <span class="text-primary-400">My balance:</span> {{ asdaiBalanceAsWxdaiHr }} WXDAI
        </div>
        <div class="shrink-0 text-xl">
          <span class="text-primary-400">APY:</span>
          {{ apyHr }}
          <button class="btn-link px-0 hover:text-primary-100" @click="showApyModal">[i]</button>
        </div>
      </div>

      <div class="px-4 py-6 text-center">
        You have no power here
      </div>

      <div class="flex flex-col space-y-1 lg:flex-row lg:space-x-1 lg:space-y-0 m-1">
        <form class="w-full max-w-[600px] border-2 border-primary-400 pb-4" @submit.prevent="deposit">
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

        <form class="w-full max-w-[600px] border-2 border-primary-400 pb-4" @submit.prevent="withdraw">
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
                :tokens="['WXDAI']"
                placeholder=""
              />

              <a class="font-semibold link-dashed text-primary-300" @click="withdrawMaxClicked">
                max {{ asdaiBalanceAsWxdaiHr }} WXDAI
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
import { decodeError, DEPOSIT_ERROR_MESSAGE_BY_ASDAI_CUSTOM_ERROR, WITHDRAW_ERROR_MESSAGE_BY_ASDAI_CUSTOM_ERROR } from '@/asdaiErrors';
import { Modal, DepositModal, WithdrawModal } from '@/useModal';
import ModalApy from '@/components/ModalApy.vue';

const isMetamaskBusy = shallowRef(false);

const { address, provider, signer } = useWallet();

const depositInput = ref(null);
const depositAmount = shallowRef(null);

const withdrawInput = ref(null);
const withdrawAmount = shallowRef(null);

const selectedDepositToken = shallowRef('WXDAI');
const selectedWithdrawToken = shallowRef('WXDAI');

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

const depositTokenSymbolList = [ 'XDAI', 'WXDAI' ];

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
  const percent = amount * 10n ** 18n / toValue(settings).totalSupply;
  const amountBase1 = toValue(settings).totalBalanceBase * percent;
  return amountBase1 * toValue(wxdaiPrice) / 10n ** 16n;
}

function convertWxdaiToAsdai(amount) {
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

async function withdraw() {
  isMetamaskBusy.value = true;

  WithdrawModal.open([
    'Withdrawing...',
    'Success!'
  ]);

  const amountInAsdai = convertWxdaiToAsdai(toValue(withdrawAmount));
  const amountSnapped = snapTo100Percent(toValue(amountInAsdai), toValue(asdaiBalance));

  let tr;

  try {
    tr = await toValue(asdaiContract).connect(toValue(signer)).withdraw(amountSnapped);

  } catch (error) {
    WithdrawModal.close();
    isMetamaskBusy.value = false;

    if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
      // user rejected
      return;
    }

    const decodedError = decodeError(toValue(asdaiContract), error);
    if (!decodedError) {
      console.error(error);
      Modal.error("Error withdrawing.");
      return;
    }

    console.error(error);
    Modal.error(WITHDRAW_ERROR_MESSAGE_BY_ASDAI_CUSTOM_ERROR[decodedError.name] || "(unknown error)");

    return;
  }

  let transactionResponse;

  try {
    transactionResponse = await tr.wait(4);
    WithdrawModal.close();

  } catch (error) {
    WithdrawModal.close();
    console.error(error);
    Modal.error("Error confirming withdrawal.");
  }

  isMetamaskBusy.value = false;
  withdrawInput.value.reset();
  withdrawAmount.value = null;

  refetch(); // fire-and-forget

  const event = transactionResponse.logs.find(a => a.eventName === 'PositionWithdraw');

  if (!event) {
    Modal.error("Withdrawal event not found in transaction receipt");
    return;
  }

  Modal.alert({
    title: "Success!",
    body: `Withdrawn ${formatUnits(event.args?.amountWxdai, 18, 4, 4)} WXDAI`
  });
}

async function deposit() {
  isMetamaskBusy.value = true;

  const steps = [
    'Approving...',
    'Depositing...',
    'Success!'
  ];

  const amountSnapped = toValue(isDepositTokenNativeCurrency)
    ? toValue(depositAmount)
    : snapTo100Percent(toValue(depositAmount), toValue(selectedDepositTokenBalanceOrNative));

  if (toValue(isDepositTokenNativeCurrency)) {
    steps.unshift('Wrapping XDAI...');
    DepositModal.open(steps);

    try {
      const tr = await toValue(wxdaiContract).connect(toValue(signer)).deposit({ value: toValue(amountSnapped) });
      await tr.wait(2);

    } catch (error) {
      DepositModal.close();
      isMetamaskBusy.value = false;

      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        // user rejected
        return;
      }

      console.error(error);
      Modal.error("Error wrapping XDAI into WXDAI!");
      return;
    }

    DepositModal.nextStep();

  } else {
    DepositModal.open(steps);
  }

  let tr;

  const allowance = await toValue(wxdaiContract).allowance(address.value, toValue(asdaiContract).address);
  if (allowance < amountSnapped) {
    try {
      tr = await toValue(wxdaiContract).connect(toValue(signer)).approve(toValue(asdaiContract).address, amountSnapped);

    } catch (error) {
      DepositModal.close();
      isMetamaskBusy.value = false;

      if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
        // user rejected
        return;
      }

      console.error(error);
      Modal.error("Error approving");
      return;
    }
  }

  DepositModal.nextStep();

  try {
    tr = await toValue(asdaiContract).connect(toValue(signer)).deposit(amountSnapped);

  } catch (error) {
    DepositModal.close();
    isMetamaskBusy.value = false;

    if (error.code === 4001 || error.code === 'ACTION_REJECTED') {
      // user rejected
      return;
    }

    const decodedError = decodeError(toValue(asdaiContract), error);
    if (!decodedError) {
      console.error(error);
      Modal.error("Error depositing.");
      return;
    }

    console.error(error);
    Modal.error(DEPOSIT_ERROR_MESSAGE_BY_ASDAI_CUSTOM_ERROR[decodedError.name] || "(unknown error)");

    return;
  }

  let transactionResponse;

  try {
    transactionResponse = await tr.wait(4);
    DepositModal.close();

  } catch (error) {
    DepositModal.close();
    console.error(error);
    Modal.alert("Error confirming deposit.");
  }

  isMetamaskBusy.value = false;
  depositInput.value.reset();
  depositAmount.value = null;

  refetch(); // fire-and-forget

  const event = transactionResponse.logs.find(a => a.eventName === 'PositionDeposit');

  if (!event) {
    Modal.error("Deposit event not found in transaction receipt");
    return;
  }

  Modal.alert({
    title: "Success!",
    body: `Deposited ${formatUnits(event.args?.amountWxdai, 18, 4, 4)} WXDAI`
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
</script>

<style scoped>
.busy {
  pointer-events: none;
}
</style>
