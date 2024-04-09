import { abi as PoolABI } from '@aave/core-v3/artifacts/contracts/interfaces/IPool.sol/IPool.json';
import { useEthersContractCall, useEthersContract } from '@/useEthersContractDependency';
import { shallowRef, toValue } from 'vue';
import { useWallet } from '@/useWallet';

export function useAaveStats(poolAddressProviderContract, dndContract) {
  const { provider } = useWallet();

  const { data: poolAddress } = useEthersContractCall(
    [ poolAddressProviderContract ],
    () => toValue(poolAddressProviderContract).getPool()
  );

  const { contract: poolContract } = useEthersContract(
    [ provider, poolAddress ],
    poolAddress,
    PoolABI,
    provider,
    'aavePool'
  );

  const availableBorrowsBase = shallowRef(null);
  const currentLiquidationThreshold = shallowRef(null);
  const healthFactor = shallowRef(null);
  const ltv = shallowRef(null);
  const totalCollateralBase = shallowRef(null);
  const totalDebtBase = shallowRef(null);

  const { isReady, refetch } = useEthersContractCall(
    [ poolContract, dndContract ],
    async () => {
      const userData = await toValue(poolContract).getUserAccountData(await toValue(dndContract).getAddress());

      availableBorrowsBase.value = userData.availableBorrowsBase;
      currentLiquidationThreshold.value = userData.currentLiquidationThreshold;
      healthFactor.value = userData.healthFactor;
      ltv.value = userData.ltv;
      totalCollateralBase.value = userData.totalCollateralBase;
      totalDebtBase.value = userData.totalDebtBase;

      return true;
    }
  );

  return {
    isReady,
    refetch,

    availableBorrowsBase,
    currentLiquidationThreshold,
    healthFactor,
    ltv,
    totalCollateralBase,
    totalDebtBase
  };
}
