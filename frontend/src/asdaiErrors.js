export function decodeError(contract, error) {
  if (!error?.data?.data) {
    return null;
  }

  try {
    return contract.interface.parseError(error.data.data);
  } catch (e) {
    console.error("Cannot decode this contract error", e);
  }

  return null;
}

const ERROR_MESSAGE_BY_ASDAI_CUSTOM_ERROR = {
  AsdaiOnlyFlashloanLender: 'Internal contract error: invalid flashloan lender',
  AsdaiUnknownFlashloanMode: 'Internal contract error: unknown flashloan mode',
  AsdaiIncorrectFlashloanTokenReceived: 'Internal contract error: incorrect flashloan token received',
  AsdaiRebalanceNotNeccessary: 'Contract decided that rebalance is not neccessary now',
  AsdaiNotEnoughToBorrow: 'Internal contract error: not enough to borrow on Aave'
};

export const DEPOSIT_ERROR_MESSAGE_BY_ASDAI_CUSTOM_ERROR = {
  ...ERROR_MESSAGE_BY_ASDAI_CUSTOM_ERROR,
  AsdaiIncorrectDepositOrWithdrawalAmount: 'Incorrect deposit amount (too low or too high)',
  AsdaiOperationDisabledByFlags: "Deposit is currently disabled on contract"
};

export const WITHDRAW_ERROR_MESSAGE_BY_ASDAI_CUSTOM_ERROR = {
  ...ERROR_MESSAGE_BY_ASDAI_CUSTOM_ERROR,
  AsdaiIncorrectDepositOrWithdrawalAmount: 'Incorrect withdrawal amount (too low or too high)',
  AsdaiOperationDisabledByFlags: "Withdrawal is currently disabled on contract"
};
