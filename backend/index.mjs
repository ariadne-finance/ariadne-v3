import fs from 'node:fs';
import Fastify from 'fastify';
import FastifyCors from '@fastify/cors';
import { ethers } from 'ethers';
import { request, gql } from 'graphql-request';

process.loadEnvFile();

const subgraphUrl = process.env.FUCK_THE_GRAPH_BASE_URL + '/' + process.env.FUCK_THE_GRAPH_API_KEY + '/subgraphs/id/' + process.env.AAVE_SUBGRAPH_ID;

/* eslint-disable */
BigInt.prototype.toJSON = function() {
  return this.toString();
};
/* eslint-enable */

function unixtime() {
  return Math.floor(Date.now() / 1000);
}

function readAbi(name) {
  return JSON.parse(fs.readFileSync(`../abi/${name}.json`));
}

const provider = new ethers.JsonRpcProvider(process.env.RPC);

let wxdaiAddress = null;
const SAVINGS_X_DAI_ADAPTER_ADDRESS = '0xD499b51fcFc66bd31248ef4b28d656d67E591A94';
const AAVE_IPOOL_ADDRESSES_PROVIDER_ADDRESS = '0x36616cf17557639614c1cdDb356b1B83fc0B2132';
const ASDAI_CONTRACT_ADDRESS = '0x48cF154a086bAB5492A8D150f4d87a74eCf90743';

let savingsXDaiAdapterContract;
let aavePoolContract;

let apy = null;

async function loadVariableBorrowRateFromTheGraph() {
  const document = gql`
    {
      reserves {
        name
        underlyingAsset
        variableBorrowRate
      }
    }`;

  const r = await request(subgraphUrl, document);

  const _wxdaiContractAddress = wxdaiAddress.toLowerCase();
  const wxdaiAaveReserve = r.reserves.find(reserve => reserve.underlyingAsset === _wxdaiContractAddress);
  return wxdaiAaveReserve?.variableBorrowRate;
}

async function possiblyLoadContracts() {
  if (!savingsXDaiAdapterContract) {
    savingsXDaiAdapterContract = new ethers.Contract(SAVINGS_X_DAI_ADAPTER_ADDRESS, readAbi('ISavingsXDaiAdapter'), provider);
    wxdaiAddress = await savingsXDaiAdapterContract.wxdai();
  }

  if (!aavePoolContract) {
    const addressProviderContract = new ethers.Contract(AAVE_IPOOL_ADDRESSES_PROVIDER_ADDRESS, readAbi('IPoolAddressesProvider'), provider);
    aavePoolContract = new ethers.Contract(await addressProviderContract.getPool(), readAbi('IPool'), provider);
  }
}

async function updateApy() {
  const _apy = {};

  await possiblyLoadContracts();

  const userData = await aavePoolContract.getUserAccountData(ASDAI_CONTRACT_ADDRESS);

  _apy.agaveVaultApy = (await savingsXDaiAdapterContract.vaultAPY()) * 10n ** 2n;
  _apy.aaveVariableBorrowRate = await loadVariableBorrowRateFromTheGraph();
  if (!_apy.aaveVariableBorrowRate) {
    return;
  }

  _apy.collateralLeverage = 100_000n * 10000n / (10000n - userData.ltv);
  _apy.leveragedAgaveVaultApy = _apy.collateralLeverage * _apy.agaveVaultApy / 100000n;
  _apy.debtLeverage = _apy.collateralLeverage * userData.ltv / 10000n;
  _apy.leveragedWxdaiBorrowRate = _apy.debtLeverage * BigInt(_apy.aaveVariableBorrowRate) / 10n ** 12n;
  _apy.apy = _apy.leveragedAgaveVaultApy - _apy.leveragedWxdaiBorrowRate;

  _apy.aaveVariableBorrowRate = BigInt(_apy.aaveVariableBorrowRate) / 10n ** 7n;

  apy = _apy;

  apy.updatedAt = unixtime();

  console.log("            agave vault apy", ethers.formatUnits(_apy.agaveVaultApy, 18));
  console.log("        collateral leverage", ethers.formatUnits(_apy.collateralLeverage, 5));
  console.log("     leveragedAgaveVaultApy", ethers.formatUnits(_apy.leveragedAgaveVaultApy, 18));
  console.log("     aave wxdai borrow rate", ethers.formatUnits(_apy.aaveVariableBorrowRate, 18));
  console.log("              debt leverage", ethers.formatUnits(_apy.debtLeverage, 5));
  console.log("leveraged wxdai borrow rate", ethers.formatUnits(_apy.leveragedWxdaiBorrowRate, 18));
  console.log("                  total apy", ethers.formatUnits(_apy.apy, 18));
}

async function cycleLoadApy() {
  try {
    await updateApy();

  } catch (e) {
    console.error("Catched error");
    console.error(e);
    console.error("Recovered");
  }

  setTimeout(cycleLoadApy, 30 * 60 * 1000); // 30min
}

cycleLoadApy();

const fastify = Fastify({ });

fastify.register(FastifyCors, {
  origin: '*'
});

fastify.get(
  '/api/apy',
  (request, reply) => {
    reply.header('Cache-Control', 'max-age=0, no-cache, no-store, must-revalidate');
    if (apy) {
      return {
        ...apy,
        success: true
      };
    }

    return { success: false };
  }
);

fastify.listen(
  {
    port: process.env.LISTEN_PORT,
    host: process.env.LISTEN_HOST
  },
  async (err, address) => {
    if (err) {
      console.log(err);
      process.exit(1);
    }

    console.log(`server listening on ${address}`);

    if (process.send) {
      process.send('ready');
    }
  }
);
