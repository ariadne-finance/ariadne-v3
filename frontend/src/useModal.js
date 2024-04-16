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
      hideButtons: true,
      componentData: depositModalData
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
      hideButtons: true,
      componentData: withdrawModalData
    });
  },
  close: () => {
    withdrawModalData.close = true;
  },
  nextStep: () => {
    withdrawModalData.step++;
  }
};
