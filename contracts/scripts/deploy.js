const { ethers, upgrades } = require("hardhat");

async function main() {
  const Asdai = await ethers.getContractFactory("Asdai");
  const asdai = await upgrades.deployProxy(Asdai, []);
  await asdai.waitForDeployment();
  console.log("Asdai deployed to:", await asdai.getAddress());
}

main();
