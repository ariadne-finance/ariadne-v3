/* eslint-disable no-await-in-loop, no-promise-executor-return */

export async function waitForTransactionReceipt({ provider, transactionHash, timeoutMs = 1000 * 60 * 2 }) { // two minutes
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    // in case via ethers:
    // const receipt = await provider.send('eth_getTransactionReceipt', [ transactionHash ]);

    // but we absolutely have to check via wallet's provider otherwise it will complain
    // that there is a pending transaction. Basically we're stuck until the wallet itself
    // sees the tranasction as confirmed.
    const receipt = await provider.request({
      method: 'eth_getTransactionReceipt',
      params: [ transactionHash ]
    });

    if (receipt) {
      return receipt;
    }

    // we don't want this to be 1 second in order to not trigger 429
    await new Promise(resolve => setTimeout(resolve, 2345));
  }

  return null;
}

export function parseLogs({ transactionReceipt, contractInterface }) {
  if (!transactionReceipt?.logs) {
    return [];
  }

  const events = [];

  for (const logEntry of transactionReceipt.logs) {
    try {
      events.push(contractInterface.parseLog(logEntry));
    } catch {} // eslint-disable-line no-empty
  }

  return events.filter(e => Boolean(e));
}
