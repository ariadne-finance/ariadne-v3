<!-- eslint-disable vue/no-v-html -->
<template>
  <TransitionRoot as="template" :show="isModalOpen">
    <Dialog as="div" class="relative z-10" @close="close">
      <TransitionChild
        as="template"
        enter="ease-out duration-300"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="ease-in duration-200"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/30 transition-opacity" />
      </TransitionChild>

      <div class="fixed inset-0 z-10 overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <TransitionChild
            as="template"
            enter="ease-out duration-300"
            enter-from="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leave-from="opacity-100 translate-y-0 sm:scale-100"
            leave-to="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel
              class="relative transform overflow-hidden p-0.5 text-left transition-all sm:my-8 sm:w-full sm:min-w-[300px] sm:max-w-max overflow-y-auto bg-primary-400"
              :class="modalClass"
            >
              <div v-if="isCloseButtonVisible" class="absolute top-2 right-6 z-10">
                <button
                  type="button"
                  class="btn btn-link text-primary-200 bg-primary-400 px-1 py-0 mb-0 items-baseline hover:brightness-100 hover:text-primary-200/60"
                  @click="hide(null)"
                >&times;</button>
              </div>

              <div class="w-full sm:flex sm:items-start border-2 border-primary-600 p-0.5">
                <div class="w-full text-center sm:text-left">
                  <DialogTitle v-if="title" as="h3" class="relative text-center text-lg font-medium leading-6 border-2 border-primary-600 h-9" :class="{ 'text-error': isError }">
                    <div class="title-dotted text-2xl">{{ title }}</div>
                  </DialogTitle>
                  <div class="mt-0.5 border-2 border-primary-600">
                    <component
                      :is="component"
                      v-if="component"
                      :data="componentData"
                      @close="hide"
                    />
                    <p v-else class="opacity-80" :class="{ 'text-error': isError }" v-html="body" />
                  </div>

                  <div class="mt-0.5 sm:flex sm:flex-row-reverse sm:justify-around sm:items-center sm:h-20 border-2 border-primary-600">
                    <button
                      ref="okButtonRef"
                      type="button"
                      class="btn bg-primary-100"
                      :class="isError ? 'btn-danger' : 'btn-primary'"
                      @click="okClickHandler"
                      v-html="okButton"
                    />
                    <button
                      v-if="cancelButton"
                      type="button"
                      class="btn-primary mr-2"
                      @click="hide"
                      v-html="cancelButton"
                    />
                  </div>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { ref, shallowRef, watch } from 'vue';
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue';
import { Modal } from '@/useModal';
import { useFocus } from '@vueuse/core';

const isModalOpen = shallowRef(false);

const isCloseButtonVisible = ref(false);

const okButtonRef = ref(null);
const okClickHandler = shallowRef(null);
const afterHideHandler = shallowRef(null);

const title = shallowRef(null);
const body = shallowRef(null);
const validation = shallowRef(null);
const cancelButton = shallowRef('Cancel');
const okButton = shallowRef('Ok');

// Note: component must be passed as raw, use markRaw() to avoid Vue warning
const component = shallowRef(null);
const componentData = shallowRef(null);
const modalClass = shallowRef(null);
const isError = shallowRef(false);

function show() {
  isModalOpen.value = true;
}

function hide(payload = null) {
  isModalOpen.value = false;
  isError.value = false;
  if (afterHideHandler.value) {
    afterHideHandler.value(payload);
  }
}

function close() {
  if (!isCloseButtonVisible.value) {
    return;
  }
  hide(null);
}

function applyOptions(options = {}) {
  title.value = options.title || null;
  body.value = options.body || null;
  validation.value = options.validation || null;
  cancelButton.value = options.cancelButton ?? 'Cancel';
  okButton.value = options.okButton ?? 'Ok';
  component.value = options.component || null;
  componentData.value = options.componentData || null;
  afterHideHandler.value = options.afterHideHandler || null;
  modalClass.value = options.modalClass || null;
  isCloseButtonVisible.value = options.isCloseButtonVisible ?? true;
}

function alert(options = {}) {
  applyOptions(options);
  cancelButton.value = null;

  return new Promise(resolve => {
    okClickHandler.value = () => {
      resolve();
      hide();
    };

    afterHideHandler.value = () => {
      resolve();
    };

    show();
    useFocus(okButtonRef, { initialValue: true });
  });
}

function error(txt) {
  if (isModalOpen.value) {
    const unwatch = watch(isModalOpen, val => {
      if (!val) {
        unwatch();
        error(txt);
      }
    });
    return null;
  }

  isError.value = true;
  return alert({
    title: 'Error',
    body: txt
  });
}

function confirm(options = {}) {
  applyOptions(options);

  return new Promise(resolve => {

    okClickHandler.value = () => {
      resolve(true);
      hide();
    };

    afterHideHandler.value = () => {
      resolve(false);
    };

    show();
    useFocus(okButtonRef, { initialValue: true });
  });
}

function dialog(options = {}) {
  applyOptions(options);

  return new Promise(resolve => {
    afterHideHandler.value = payload => {
      resolve(payload);
    };

    show();
  });
}

Modal.alert = alert;
Modal.confirm = confirm;
Modal.dialog = dialog;
Modal.error = error;
</script>
