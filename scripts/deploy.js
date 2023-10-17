const { ethers, run, network } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  const tokenFactory = await ethers.getContractFactory("Token");
  const token = await tokenFactory.deploy();
  await token.waitForDeployment();

  console.log(`Token deployed at ` + (await token.getAddress()));
  const tokenAddress = await token.getAddress();

  const stakingTokenFactory = await ethers.getContractFactory("ERC20Staking");
  const stakingToken = await stakingTokenFactory.deploy(tokenAddress);
  await stakingToken.waitForDeployment();

  console.log(`Staking Token deployed at ` + (await stakingToken.getAddress()));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
