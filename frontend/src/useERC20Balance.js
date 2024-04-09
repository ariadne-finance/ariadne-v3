import { useEthersContractCall } from '@/useEthersContractDependency';
import { toValue } from 'vue';

export function useERC20Balance(contract, address) {
  const { data: balance, isReady, refetch } = useEthersContractCall(
    [ contract, address ],
    () => toValue(contract).balanceOf(toValue(address))
  );

  return {
    balance,
    isReady,
    refetch
  };
}
