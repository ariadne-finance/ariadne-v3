// import CollectorABI from '@abi/Collector.json';
import ERC20ABI from '@abi/IERC20.json';
import { useEthersContractCall, useEthersContract } from '@/useEthersContractDependency';
import { lookup } from 'erc20lookup';
import { watch, computed, toValue, shallowRef, toRaw } from 'vue';
import { useWallet } from '@/useWallet';
import { ethers } from 'ethers';

export function useCollector() {
  const { provider, chainId } = useWallet();

  const contractAddress = 'FIXME'

  // we ignore readiness on this contract, because none of the other values
  // will be ready until this contract is.
  const { contract } = useEthersContract(
    [ provider, contractAddress ],
    contractAddress,
    CollectorABI,
    provider
  );

  const { data: tokensList, isReady, refetch } = useEthersContractCall(
    [ contract ],
    async () => toValue(contract).getAllowedTokens()
  );

  const tokenContracts = shallowRef([]);
  const isLookupDone = shallowRef(false);

  watch(tokensList, async () => {
    if (tokensList.value === null) {
      tokenContracts.value = [];
      return;
    }

    const _contracts = [];

    for (const tokenAddress of tokensList.value) {
      const _contract = new ethers.Contract(tokenAddress, ERC20ABI, toValue(provider));
      _contract.provider = toValue(provider);
      _contracts.push(_contract);
    }

    tokenContracts.value = _contracts;
  });

  watch(tokenContracts, async () => {
    isLookupDone.value = false;
    if (tokenContracts.value.length === 0) {
      return;
    }

    const contracts = tokenContracts.value.map(c => toRaw(c));
    await lookup(toValue(provider), contracts);
    isLookupDone.value = true;
  });

  return {
    contract,
    isReady,
    refetch,
    tokensList,
    tokenContracts,
    isLookupDone
  };
}
