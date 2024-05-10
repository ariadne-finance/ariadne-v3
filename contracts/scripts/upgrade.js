const { ethers, upgrades } = require("hardhat");

async function main() {
  const Asdai = await ethers.getContractFactory("Asdai");

  const upgraded = await upgrades.upgradeProxy(process.env.ADDRESS, Asdai);
  await upgraded.waitForDeployment();

  console.log('Upgraded at', await upgraded.getAddress());
}

main();
