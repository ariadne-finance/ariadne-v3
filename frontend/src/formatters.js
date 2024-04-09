import { ethers } from 'ethers';

function _cutDecimals(str, decimalsMax = 2) {
  const s = str.split('.');
  if (s.length === 1) {
    return s[0];
  }

  return s[0] + '.' + s[1].substring(0, decimalsMax);
}

function _format(value, decimals, decimalsMax, decimalsMin) {
  const formattedString = ethers.formatUnits(value.toString(), decimals);

  if (decimalsMax === 0) {
    return Math.ceil(formattedString);
  }

  const cutDecimalsString = _cutDecimals(formattedString, decimalsMax);

  if (!decimalsMin) {
    return cutDecimalsString;
  }

  const s = cutDecimalsString.split('.');

  const fractionalPart = s.length === 1 ? '' : s[1];
  return s[0] + '.' + fractionalPart.padEnd(decimalsMin, '0');
}

export function formatUSD(value) {
  if ((value ?? null) === null) {
    return '…';
  }
  return '$' + _format(value, 2, 2, 2);
}

export function formatContractUnitsWithSymbol(value, contract, decimalsMax = 18, decimalsMin = 0) {
  if ((value ?? null) === null) {
    return '…';
  }

  if (!contract?.erc20?.decimals) {
    console.warn('formatContractUnitsWithSymbol called w/o contract.erc20');
    return '…';
  }

  return _format(value, contract.erc20.decimals, decimalsMax, decimalsMin) + ' ' + (contract.erc20?.symbol || '');
}

export function formatContractUnits(value, contract, decimalsMax = 18, decimalsMin = 0) {
  if ((value ?? null) === null) {
    return '…';
  }

  if (!contract?.erc20?.decimals) {
    console.warn('$formatContractUnits called w/o contract.erc20');
    return '…';
  }

  return _format(value, contract.erc20.decimals, decimalsMax, decimalsMin);
}

export function formatUnits(value, decimals, decimalsMax, decimalsMin) {
  if ((value ?? null) === null) {
    return '…';
  }

  if (!decimals) {
    console.warn('formatUnits called w/o decimals');
    return '…';
  }

  const _decimalsMax = decimalsMax || decimals;
  const _decimalsMin = decimalsMin || decimals;

  return _format(value, decimals, _decimalsMax, _decimalsMin);
}

export function shortAddress(address) {
  const addressChecksum = ethers.getAddress(address);
  return addressChecksum.substring(0, 6) + '…' + addressChecksum.substring(38);
}
