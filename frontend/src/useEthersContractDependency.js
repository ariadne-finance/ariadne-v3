import { shallowRef, watch, toValue, ref } from 'vue';
import { ethers } from 'ethers';

export function useEthersContract(dependenciesList, address, abi, provider) {
  const contract = shallowRef(null);
  const isReady = shallowRef(false);

  watch(
    dependenciesList,

    async () => {
      if (dependenciesList.find(e => (toValue(e) ?? null) === null)) {
        isReady.value = false;
        contract.value = null;
        return;
      }

      if (toValue(contract) !== null) {
        const _newAddress = toValue(address).toLowerCase();
        const _existingAddress = (await toValue(contract).getAddress()).toLowerCase();

        if (_existingAddress === _newAddress) {
          if (toValue(provider).chainId === toValue(contract).provider.chainId) {
            console.debug("Not replacing existing contract", _newAddress, 'on network', toValue(contract).provider.chainId, 'with new network', toValue(provider).chainId);
            return;
          }
          console.debug("Replacing contract", _newAddress, 'from network', toValue(contract).provider.chainId, 'on network', toValue(provider).chainId);
        }
      }

      try {
        contract.value = new ethers.Contract(toValue(address), toValue(abi), toValue(provider));
      } catch (e) {
        console.error(`Error creating contract at address ${toValue(address)}`);
        console.error(e);
        console.trace();
      }

      contract.value.provider = toValue(provider);
      console.debug("Created contract", toValue(address), "on network", toValue(provider).chainId);

      isReady.value = true;
    },
    {
      immediate: true
    }
  );

  return {
    contract,
    isReady
  };
}

export function useEthersContractCall(dependenciesList, getter) {
  const data = ref(undefined);
  const isReady = shallowRef(false);

  const refetch = async () => data.value = await getter();

  watch(
    dependenciesList,
    async () => {
      if (dependenciesList.find(e => (toValue(e) ?? null) === null)) {
        isReady.value = false;
        data.value = undefined;
        return;
      }

      await refetch();

      if (toValue(data) !== undefined) {
        isReady.value = true;
      }
    },
    {
      immediate: true
    }
  );

  return {
    data,
    isReady,
    refetch
  };
}
