export function decodeError(contract, error) {
  // raw transaction, or estimateGas error or ethers error or or or ... stop it
  let data = error?.data?.originalError?.data || error?.data?.data || error?.data;

  if (!data) {
    // but sometimes error is reported in the message
    const message = error.message || error.data?.message || error.originalError?.message || error.originalError?.data?.message || '';
    if (message.startsWith("Reverted 0x")) {
      data = message.substring(9);
    }
  }

  if (!data) {
    return null;
  }

  // or sometimes it's an object, oh gosh fuck I hate defi
  if (typeof data === 'object') {
    return null;
  }

  try {
    return contract.interface.parseError(data);
  } catch (e) {
    console.error("Cannot decode this contract error", e);
    console.error(e);
  }

  return null;
}

export const ERROR_MESSAGE_BY_ASDAI_CUSTOM_ERROR = {
  AsdaiOnlyFlashloanLender: 'Internal contract error: invalid flashloan lender',
  AsdaiUnknownFlashloanMode: 'Internal contract error: unknown flashloan mode',
  AsdaiIncorrectFlashloanTokenReceived: 'Internal contract error: incorrect flashloan token received',
  AsdaiRebalanceNotNeccessary: 'Contract decided that rebalance is not neccessary now',
  AsdaiNotEnoughToBorrow: 'Not enough token to borrow on Aave. Please try to deposit larger amount',
  AsdaiIncorrectDepositOrWithdrawalAmount: 'Incorrect deposit or withdraw amount (too low or too high)',
  AsdaiOperationDisabledByFlags: "Operation is currently disabled on contract"
};

export function isMetamaskRejected(error) {
  return error.code === 4001 || error.code === 'ACTION_REJECTED';
}

export function isMetamaskMissingRorV(error) {
  if (!error?.message) {
    return false;
  }

  return error.message.startsWith('missing r') || error.message.startsWith('missing v');
}
