import { useEthersContractCall, useEthersContract } from '@/useEthersContractDependency';
import { shallowRef, toValue } from 'vue';
import { abi as IPoolAddressesProviderABI } from '@aave/core-v3/artifacts/contracts/interfaces/IPoolAddressesProvider.sol/IPoolAddressesProvider.json';
import { abi as IAaveOracleABI } from '@aave/core-v3/artifacts/contracts/interfaces/IAaveOracle.sol/IAaveOracle.json';
import { useWallet } from '@/useWallet';
// import { CHAIN } from '@/useChains';

export function useOracle(stableTokenContract, mainTokenContract) {
  const { provider, chainId } = useWallet();

  const CHAIN = {}; // FIXME

  const { contract: poolAddressProviderContract } = useEthersContract(
    [ provider, chainId ],
    CHAIN[toValue(chainId)].aaveAddressesProvider,
    IPoolAddressesProviderABI,
    provider
  );

  const { data: priceOracleAddress } = useEthersContractCall(
    [ poolAddressProviderContract ],
    () => toValue(poolAddressProviderContract).getPriceOracle()
  );

  const { contract: aaveOracleContract } = useEthersContract(
    [ provider, priceOracleAddress ],
    priceOracleAddress,
    IAaveOracleABI,
    provider
  );

  const stableTokenPrice = shallowRef(null);
  const mainTokenPrice = shallowRef(null);

  const { isReady, refetch } = useEthersContractCall(
    [ aaveOracleContract, mainTokenContract, stableTokenContract ],
    async () => {
      const assetPrices = await toValue(aaveOracleContract).getAssetsPrices([
        await toValue(mainTokenContract).getAddress(),
        await toValue(stableTokenContract).getAddress()
      ]);

      mainTokenPrice.value = assetPrices[0];
      stableTokenPrice.value = assetPrices[1];

      return true;
    }
  );

  return {
    isReady,
    refetch,

    stableTokenPrice,
    mainTokenPrice,
    poolAddressProviderContract
  };
}
