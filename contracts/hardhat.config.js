require('@nomicfoundation/hardhat-chai-matchers');
require('@nomicfoundation/hardhat-verify');
require('hardhat-abi-exporter');
require('hardhat-contract-sizer');
require('hardhat-deal');
require('@openzeppelin/hardhat-upgrades');

const accounts = vars.has('PRIVATE_KEY') ? [ vars.get('PRIVATE_KEY') ] : undefined;

module.exports = {
  networks: {
    // This is required for gnosis fork. Numberes are imaginary.
    hardhat: {
      chains: {
        0x64: {
          hardforkHistory: {
            berlin: 10000000,
            london: 20000000,
          }
        }
      }
    },

    forked: {
      url: 'http://127.0.0.1:8545',
      accounts
    },

    xdai: {
      url: `https://rpc.gnosis.gateway.fm`,
      accounts
    }
  },

  etherscan: {
    apiKey: {
      xdai: vars.get('ETHERSCAN_GNOSIS', null)
    }
  },

  solidity: {
    compilers: [
      {
        version: '0.8.25',
        evmVersion: `paris`,
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          outputSelection: {
            "*": {
              "*": ["storageLayout"]
            }
          }
        }
      }
    ]
  },

  abiExporter: {
    path: '../abi',
    runOnCompile: false,
    clear: true,
    flat: true,
    spacing: 2,
    pretty: false
  }
};
