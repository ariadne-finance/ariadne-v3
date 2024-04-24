export function decodeError(contract, error) {
  const data = error?.data?.data || error?.data;

  if (!data) {
    return null;
  }

  try {
    return contract.interface.parseError(data);
  } catch (e) {
    console.error("Cannot decode this contract error", e);
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
