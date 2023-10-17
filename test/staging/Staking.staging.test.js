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
        token = Token.attach("0x8b672Ed8dCcf66A803aFD167Cd854496FF7Ce417");

        const Staking = await ethers.getContractFactory("ERC20Staking");
        stakingToken = Staking.attach(
          "0x851784e13D8803c5d7e13d410d611931B9380935"
        );
      });

      it("Staging test", async () => {
        const transfer = await token
          .connect(owner)
          .transfer(account.address, amount);
        await transfer.wait();

        const approveAccount = await token
          .connect(account)
          .approve(stakingToken.getAddress(), amount);
        await approveAccount.wait();

        const stakeAccount = await stakingToken.connect(account).stake(amount);
        await stakeAccount.wait();

        //STAKE
        console.log("STAKE");
        const approve = await token
          .connect(owner)
          .approve(stakingToken.getAddress(), amount);
        await approve.wait();
        const stake = await stakingToken.connect(owner).stake(amount);
        await stake.wait();
        const userBalance = await stakingToken
          .connect(owner)
          .balanceOf(owner.address);
        assert.equal(amount.toString(), userBalance.toString());

        //GETLASTSTAKETIME
        console.log("LAST STAKE TIME");
        const stakeTime = await stakingToken
          .connect(owner)
          .getLastStakeTime(owner.address);
        assert.notEqual(0, stakeTime.toString());

        console.log("Wait...");
        await sleep(70000);

        //EARNED
        console.log("EARNED");
        const earned = await stakingToken.earned(owner.address);
        const calculate = (Number(BigInt(userBalance)) * 2_000) / 10_000;
        assert.equal(earned.toString(), calculate.toString());

        //CLAIMREWARD
        console.log("CLAIMREWARD");
        const beforeClaimReward = await token
          .connect(owner)
          .balanceOf(owner.address);
        const earnedforClaim = await stakingToken.earned(owner.address);

        const claimReward = await stakingToken.connect(owner).claimReward();
        await claimReward.wait();

        const afterClaimReward = await token
          .connect(owner)
          .balanceOf(owner.address);
        assert.equal(beforeClaimReward + earnedforClaim, afterClaimReward);

        //WITHDRAW
        console.log("WITHDRAW");
        const balance = await stakingToken.balanceOf(owner.address);
        const withdraw = await stakingToken.connect(owner).withdraw(balance);
        await withdraw.wait();
        const afterWithdraw = await stakingToken.balanceOf(owner.address);
        assert.equal(afterWithdraw.toString(), "0");
      });
    });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
