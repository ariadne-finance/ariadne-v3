import AsdaiABI from '@abi/Asdai.json';
import WXDAIABI from '@abi/WXDAI.json';
import IPoolAddressesProviderABI from '@abi/IPoolAddressesProvider.json';
import IAaveOracleABI from '@abi/IAaveOracle.json';
import { useEthersContractCall, useEthersContract } from '@/useEthersContractDependency';
import { lookup } from 'erc20lookup';
import { watch, computed, toValue, shallowRef, toRaw } from 'vue';
import { useWallet } from '@/useWallet';
import { ethers } from 'ethers';

export function useAsdai() {
  const { provider, chainId } = useWallet();

  const asdaiContractAddress = '0xDE9D935D7ad652b2c6F4CF3e9F615a905530F25B'

  const { contract: asdaiContract, isReady: isAsdaiContractReady } = useEthersContract(
    [ provider, asdaiContractAddress ],
    asdaiContractAddress,
    AsdaiABI,
    provider
  );

  const AAVE_IPOOL_ADDRESSES_PROVIDER_ADDRESS = '0x36616cf17557639614c1cdDb356b1B83fc0B2132';

  const { contract: aaveAddressProviderContract } = useEthersContract(
    [ provider, AAVE_IPOOL_ADDRESSES_PROVIDER_ADDRESS ],
    AAVE_IPOOL_ADDRESSES_PROVIDER_ADDRESS,
    IPoolAddressesProviderABI,
    provider
  );

  // we don't refetch this
  const { data: aavePriceOracleAddress } = useEthersContractCall(
    [ aaveAddressProviderContract ],
    async () => toValue(aaveAddressProviderContract).getPriceOracle()
  );

  const { contract: aavePriceOracleContract } = useEthersContract(
    [ provider, aavePriceOracleAddress ],
    aavePriceOracleAddress,
    IAaveOracleABI,
    provider
  );

  const wxdaiContractAddress = '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d';

  const { data: wxdaiPrice, refetch: refetchWxdaiPrice, isReady: isWxdaiPriceReady } = useEthersContractCall(
    [ aavePriceOracleContract ],
    async () => toValue(aavePriceOracleContract).getAssetPrice(wxdaiContractAddress)
  );

  const { contract: wxdaiContract, isReady: isWxdaiContractReady } = useEthersContract(
    [ provider, wxdaiContractAddress ],
    wxdaiContractAddress,
    WXDAIABI,
    provider
  );

  const { data: settings, isReady: isSettingsReady, refetch: refetchSettings } = useEthersContractCall(
    [ asdaiContract ],
    async () => {
      const r = await Promise.all([
        toValue(asdaiContract).minDepositAmount(),
        toValue(asdaiContract).maxDepositAmount(),
        toValue(asdaiContract).totalSupply(),
        toValue(asdaiContract).totalBalanceBase()
      ]);

      return {
        minDepositAmount: r[0],
        maxDepositAmount: r[1],
        totalSupply: r[2],
        totalBalanceBase: r[3]
      };
    }
  );

  async function refetch() {
    await Promise.all([
      refetchSettings(),
      refetchWxdaiPrice()
    ]);
  }

  const isReady = computed(() => isAsdaiContractReady.value
    && isWxdaiContractReady.value
    && isSettingsReady.value
    && isWxdaiPriceReady.value
  );

  return {
    asdaiContract,
    wxdaiContract,
    wxdaiPrice,
    isReady,
    refetch,
    settings
  };
}
