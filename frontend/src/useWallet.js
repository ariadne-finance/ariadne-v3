import { init as initOnboard, useOnboard } from '@web3-onboard/vue';
import injectedModule from '@web3-onboard/injected-wallets';
import { shallowRef, watchEffect } from 'vue';
import { ethers } from 'ethers';
import { isDark } from './useDark';

const onboard = shallowRef(null);

const address = shallowRef(null);
const provider = shallowRef(null);
const signer = shallowRef(null);
const chainId = shallowRef(null);

let isWatchesSet = false;

const injected = injectedModule();

const chains = [
  {
    id: 0x64,
    token: 'XDAI',
    label: 'Gnosis',
    // rpcUrl: 'https://gnosis.drpc.org',
    // publicRpcUrl: 'https://gnosis.drpc.org',
    rpcUrl: 'https://gnosis-rpc.publicnode.com',
    publicRpcUrl: 'https://gnosis-rpc.publicnode.com',
    // FIXME
    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 68" width="88px" height="68px"><path d="M63.5,34l12-5.8l4.1-12.4l-8.2-5.9H16.5L3.8,19.1h64.5l-3.4,10.5H39.1l-2.5,7.6h25.9l-7.2,22l12.1-5.9L71.6,40 l-8.1-5.9L63.5,34z" fill="#FCFC03" /><path d="M22.1,49.6l7.5-22.9l-8.3-6.1L8.8,59.1h46.3l3.1-9.5H22.1z" fill="#FCFC03" /></svg>',
    // FIXME
    color: '#18180b'
  }
];

const appMetadata = {
  name: 'FIXME',
  // FIXME
  logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 39 39"><rect class="cls-1" x="0.38" y="0.38" width="38.25" height="38.25" fill="#1a1d26" stroke="#41444b" /><path d="M9.28,24.75a1.79,1.79,0,0,1-.91-.24,1.84,1.84,0,0,1-.65-.65A1.79,1.79,0,0,1,7.48,23v-.42H8.69V23a.62.62,0,0,0,.59.59h7.2a.54.54,0,0,0,.41-.18.53.53,0,0,0,.17-.41V20.54a.53.53,0,0,0-.17-.41.57.57,0,0,0-.41-.17H9.28a1.79,1.79,0,0,1-.91-.24,2,2,0,0,1-.65-.65,1.76,1.76,0,0,1-.24-.9V15.75a1.79,1.79,0,0,1,.24-.91,1.84,1.84,0,0,1,.65-.65A1.79,1.79,0,0,1,9.28,14h7.2a1.79,1.79,0,0,1,.91.24,1.84,1.84,0,0,1,.65.65,1.79,1.79,0,0,1,.24.91v.42H17.06v-.42a.58.58,0,0,0-.58-.58H9.28a.53.53,0,0,0-.41.17.54.54,0,0,0-.18.41v2.42a.53.53,0,0,0,.18.4.57.57,0,0,0,.41.17h7.2a1.79,1.79,0,0,1,.91.24,1.87,1.87,0,0,1,.65.66,1.71,1.71,0,0,1,.24.9V23a1.79,1.79,0,0,1-.24.91,1.84,1.84,0,0,1-.65.65,1.79,1.79,0,0,1-.91.24Z" fill="#acacac" /><polygon points="19.89 24.75 19.89 13.95 21.56 13.95 29.48 23.37 29.48 13.95 30.7 13.95 30.7 24.75 29.03 24.75 21.11 15.33 21.11 24.75 19.89 24.75" fill="#f47a20" /></svg>',
  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 39 39"><rect class="cls-1" x="0.38" y="0.38" width="38.25" height="38.25" fill="#1a1d26" stroke="#41444b" /><path d="M9.28,24.75a1.79,1.79,0,0,1-.91-.24,1.84,1.84,0,0,1-.65-.65A1.79,1.79,0,0,1,7.48,23v-.42H8.69V23a.62.62,0,0,0,.59.59h7.2a.54.54,0,0,0,.41-.18.53.53,0,0,0,.17-.41V20.54a.53.53,0,0,0-.17-.41.57.57,0,0,0-.41-.17H9.28a1.79,1.79,0,0,1-.91-.24,2,2,0,0,1-.65-.65,1.76,1.76,0,0,1-.24-.9V15.75a1.79,1.79,0,0,1,.24-.91,1.84,1.84,0,0,1,.65-.65A1.79,1.79,0,0,1,9.28,14h7.2a1.79,1.79,0,0,1,.91.24,1.84,1.84,0,0,1,.65.65,1.79,1.79,0,0,1,.24.91v.42H17.06v-.42a.58.58,0,0,0-.58-.58H9.28a.53.53,0,0,0-.41.17.54.54,0,0,0-.18.41v2.42a.53.53,0,0,0,.18.4.57.57,0,0,0,.41.17h7.2a1.79,1.79,0,0,1,.91.24,1.87,1.87,0,0,1,.65.66,1.71,1.71,0,0,1,.24.9V23a1.79,1.79,0,0,1-.24.91,1.84,1.84,0,0,1-.65.65,1.79,1.79,0,0,1-.91.24Z" fill="#acacac" /><polygon points="19.89 24.75 19.89 13.95 21.56 13.95 29.48 23.37 29.48 13.95 30.7 13.95 30.7 24.75 29.03 24.75 21.11 15.33 21.11 24.75 19.89 24.75" fill="#f47a20" /></svg>',
  description: 'FIXME',
  recommendedInjectedWallets: [
    { name: 'MetaMask', url: 'https://metamask.io' }
  ]
};

const customLightTheme = {
  '--w3o-background-color': '#ffffff',
  '--w3o-foreground-color': '#EFF1FC',
  '--w3o-text-color': '#1a1d26',
  '--w3o-border-color': '#d0d4f7',
  '--w3o-action-color': '#1970b3',
  '--w3o-border-radius': '16px',
  '--w3o-font-family': 'inherit'
};

const customDarkTheme = {
  '--w3o-background-color': '#1A1D26',
  '--w3o-foreground-color': '#242835',
  '--w3o-text-color': '#EFF1FC',
  '--w3o-border-color': '#33394B',
  '--w3o-action-color': '#1970b3',
  '--w3o-border-radius': '16px',
  '--w3o-font-family': 'inherit'
};

export function init() {
  onboard.value = initOnboard({
    wallets: [ injected ],
    chains,
    appMetadata,
    theme: isDark.value ? customDarkTheme : customLightTheme,
    connect: {
      autoConnectAllPreviousWallet: true
    },
    accountCenter: {
      desktop: {
        enabled: true,
        position: 'topRight',
        minimal: false
      },
      mobile: {
        enabled: true,
        position: 'topRight',
        minimal: false
      }
    }
  });
}

function setWatchers() {
  const { connectedWallet } = useOnboard();

  watchEffect(async () => {
    address.value = connectedWallet.value?.accounts?.[0]?.address || null;
    provider.value = connectedWallet.value?.provider ? new ethers.BrowserProvider(connectedWallet.value.provider, 'any') : null;

    chainId.value = parseInt(connectedWallet.value?.provider?.chainId, 16) || null;

    if (provider.value) {
      provider.value.chainId = chainId.value;
    }

    signer.value = provider.value ? await provider.value.getSigner() : null;
  });

  isWatchesSet = true;
}

function setTheme(theme) {
  const _theme = theme === 'dark' ? customDarkTheme : customLightTheme;
  onboard.value.state.actions.updateTheme(_theme);
}

export function useWallet() {
  if (!isWatchesSet) {
    setWatchers();
  }

  return {
    address,
    provider,
    signer,
    chainId,
    setTheme
  };
}
