import { reactive } from 'vue';
import ModalDeposit from '@/components/ModalDeposit.vue';
import ModalWithdraw from '@/components/ModalWithdraw.vue';

export const Modal = reactive({
  alert: () => {},
  error: () => {},
  confirm: () => {},
  dialog: () => {}
});

const depositModalData = reactive({
  step: 1,
  steps: [],
  close: false
});

export const DepositModal = {
  open: steps => {
    Object.assign(depositModalData, { step: 1, steps, close: false });
    Modal.dialog({
      component: ModalDeposit,
      isCloseButtonVisible: false,
      componentData: depositModalData,
      modalClass: 'border-slate-600 dark:border-slate-400'
    });
  },
  close: () => {
    depositModalData.close = true;
  },
  nextStep: () => {
    depositModalData.step++;
  }
};

const withdrawModalData = reactive({
  step: 1,
  steps: [],
  close: false
});

export const WithdrawModal = {
  open: steps => {
    Object.assign(withdrawModalData, { step: 1, steps, close: false });
    Modal.dialog({
      component: ModalWithdraw,
      isCloseButtonVisible: false,
      componentData: withdrawModalData,
      modalClass: 'border-slate-600 dark:border-slate-400'
    });
  },
  close: () => {
    withdrawModalData.close = true;
  },
  nextStep: () => {
    withdrawModalData.step++;
  }
};
