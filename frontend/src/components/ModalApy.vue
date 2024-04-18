<template>
  <div v-if="data.apy" class="mx-8 my-4 sm:min-w-[400px] text-primary-200 space-y-0.5">
    <div><span class="min-w-20 inline-block pr-2 text-right text-primary-100">{{ formatUnits(data.apy.agaveVaultApy, 18, 2, 2) }}%</span> Agave sDAI APY</div>
    <div><span class="min-w-20 inline-block pr-2 text-right text-primary-100">{{ formatUnits(data.apy.collateralLeverage, 5, 2, 2) }}&times;</span> Collateral leverage</div>
    <div><span class="min-w-20 inline-block pr-2 text-right text-primary-100">{{ formatUnits(data.apy.leveragedAgaveVaultApy, 18, 2, 2) }}%</span> Leveraged Agave sDAI APY</div>
    <div><span class="min-w-20 inline-block pr-2 text-right text-primary-100">{{ formatUnits(data.apy.aaveVariableBorrowRate, 18, 2, 2) }}%</span> Aave WXDAI borrow rate</div>
    <div><span class="min-w-20 inline-block pr-2 text-right text-primary-100">{{ formatUnits(data.apy.debtLeverage, 5, 2, 2) }}&times;</span> Debt leverage</div>
    <div><span class="min-w-20 inline-block pr-2 text-right text-primary-100">{{ formatUnits(data.apy.leveragedWxdaiBorrowRate, 18, 2, 2) }}%</span> Leveraged Aave WXDAI borrow rate</div>
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
