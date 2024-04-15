<template>
  <div v-if="data.apy" class="mx-8 my-4 sm:min-w-[400px] text-primary-200 space-y-0.5">
    <div>agave vault apy: <span class="text-primary-100">{{ formatUnits(data.apy.agaveVaultApy, 18, 2, 2) }}%</span></div>
    <div>collateral leverage: <span class="text-primary-100">&times;{{ formatUnits(data.apy.collateralLeverage, 5, 2, 2) }}</span></div>
    <div>leveragedAgaveVaultApy: <span class="text-primary-100">{{ formatUnits(data.apy.leveragedAgaveVaultApy, 18, 2, 2) }}%</span></div>
    <div>aave wxdai borrow rate: <span class="text-primary-100">{{ formatUnits(data.apy.aaveVariableBorrowRate, 18, 2, 2) }}%</span></div>
    <div>debt leverage: <span class="text-primary-100">&times;{{ formatUnits(data.apy.debtLeverage, 5, 2, 2) }}</span></div>
    <div>leveraged wxdai borrow rate: <span class="text-primary-100">{{ formatUnits(data.apy.leveragedWxdaiBorrowRate, 18, 2, 2) }}%</span></div>
  </div>
</template>

<script setup>
import { formatUnits } from '@/formatters';

defineProps({
  data: {
    type: Object,
    required: true
  }
});
</script>
