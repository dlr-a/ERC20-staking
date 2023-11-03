const { assert } = require("chai");
const { network, ethers, getNamedAccounts } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Staking Staging Test", () => {
      let stakingToken;
      let token;
      let owner;
      let account;
      const amount = ethers.parseEther("0.00000000000000001");

      beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer;
        const [account1, account2] = await ethers.getSigners();
        owner = account1;
        account = account2;

        const Token = await ethers.getContractFactory("Token");
        token = Token.attach("0xdeC37e363e3FA6eEaDDEa943939B2eFceA0CD658");

        const Staking = await ethers.getContractFactory("ERC20Staking");
        stakingToken = Staking.attach(
          "0xbFB6E0A0641FCDb0298386555F5EEbdeB9820E59"
        );
      });

      it("Staging test", async () => {
        const transfer = await token.transfer(account.address, amount);
        await transfer.wait();

        const approveAccount = await token
          .connect(account)
          .approve(stakingToken.getAddress(), amount);
        await approveAccount.wait();

        const stakeAccount = await stakingToken.connect(account).stake(amount);
        await stakeAccount.wait();

        // const unstakee = await stakingToken.unStake();
        // await unstakee.wait();

        //STAKE
        console.log("STAKE");
        const approve = await token.approve(stakingToken.getAddress(), amount);
        await approve.wait();
        const stake = await stakingToken.stake(amount);
        await stake.wait();
        const userBalance = await stakingToken.balanceOf(owner.address);
        assert.equal(amount.toString(), userBalance.toString());

        console.log("Wait...");
        await sleep(70000);

        //EARNED
        console.log("EARNED");
        const earned = await stakingToken.earned(owner.address);
        const calculate = (Number(BigInt(userBalance)) * 2_000) / 10_000;
        assert.equal(earned.toString(), calculate.toString());

        //HARVEST
        console.log("HARVEST");
        const beforeHarvest = await token.balanceOf(owner.address);
        const earnedForHarvest = await stakingToken.earned(owner.address);

        const harvest = await stakingToken.harvest();
        await harvest.wait();

        const afterHarvest = await token.balanceOf(owner.address);
        assert.equal(beforeHarvest + earnedForHarvest, afterHarvest);

        //UNSTAKE
        console.log("UNSTAKE");
        const unstake = await stakingToken.unStake();
        await unstake.wait();
        const afterUnstake = await stakingToken.balanceOf(owner.address);
        assert.equal(afterUnstake.toString(), "0");
        console.log(afterUnstake);
      });
    });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
