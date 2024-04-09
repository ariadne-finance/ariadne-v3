export function snapTo100Percent(amount, hundredPercentAmount) {
  const diff = hundredPercentAmount - amount;
  const diffAbs = diff < 0n ? -diff : diff;

  const percent = hundredPercentAmount / 100n;

  return diffAbs <= percent ? hundredPercentAmount : amount;
}
