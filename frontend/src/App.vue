<template>
  <div class="flex flex-col w-full min-h-full">
    <wallet-component />
    <div class="grow flex flex-col w-full">
      <router-view />
    </div>
    <the-footer />
  </div>

  <modal-dialog />
</template>

<script setup>
import WalletComponent from './components/WalletComponent.vue';
import TheFooter from './components/TheFooter.vue';
import ModalDialog from '@/components/ModalDialog.vue';
</script>
