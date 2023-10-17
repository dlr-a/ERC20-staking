const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("StakingToken", () => {
      let StakingToken;
      let stakingToken;
      let token;
      let tokenAddress;
      let owner;
      let account;
      const addressZero = ethers.ZeroAddress;
      const amount = 100;

      beforeEach(async () => {
        const [account1, account2] = await ethers.getSigners();
        owner = account1;
        account = account2;

        const Token = await ethers.getContractFactory("Token");
        token = await Token.deploy();
        tokenAddress = await token.getAddress();

        StakingToken = await ethers.getContractFactory("ERC20Staking");
        stakingToken = await StakingToken.deploy(tokenAddress);
      });

      describe("constructor", () => {
        it("Should revert when setting token address to the zero address", async () => {
          await expect(StakingToken.deploy(addressZero)).to.be.revertedWith(
            "Token address can't be address zero"
          );
        });
      });

      describe("Stake", () => {
        it("amount can't be zero", async () => {
          await expect(stakingToken.connect(owner).stake(0)).to.be.revertedWith(
            "amount = 0"
          );
        });

        it("staking contract balance should be bigger than amount", async () => {
          await expect(
            stakingToken.connect(account).stake(amount)
          ).to.be.revertedWith("ERC20: insufficient allowance");
        });

        it("user should allow", async () => {
          await expect(
            stakingToken.connect(owner).stake(amount)
          ).to.be.revertedWith("ERC20: insufficient allowance");
        });

        it("balanceOf should increase", async () => {
          const newAmount = amount * 2;
          await token
            .connect(owner)
            .approve(stakingToken.getAddress(), newAmount);
          await stakingToken.connect(owner).stake(amount);
          const beforeBalanceOf = await stakingToken.balanceOf(owner.address);
          await stakingToken.connect(owner).stake(amount);
          const afterBalanceOf = await stakingToken.balanceOf(owner.address);
          console.log(
            await token.connect(owner).balanceOf(stakingToken.getAddress())
          );
          assert.equal(Number(afterBalanceOf) - amount, beforeBalanceOf);
        });

        it("totalSupply should increase", async () => {
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(owner).stake(amount);
          const totalSupply = await stakingToken.totalSupply();
          assert.equal(amount.toString(), totalSupply.toString());
        });

        it("reward should increase", async () => {
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          const beforeStake = await stakingToken.earned(owner.address);
          await stakingToken.connect(owner).stake(amount);
          await time.increase(50);
          const afterStake = await stakingToken.earned(owner.address);
          assert.notEqual(beforeStake, afterStake);
        });

        it("stakeTime should work", async () => {
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          const beforeStake = await stakingToken
            .connect(owner)
            .getLastStakeTime(owner.address);
          await stakingToken.connect(owner).stake(amount);
          await time.increase(10);
          const afterStake = await stakingToken
            .connect(owner)
            .getLastStakeTime(owner.address);
          assert.notEqual(beforeStake, afterStake);
        });

        it("should emit stake event with correct data", async () => {
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          const stake = await stakingToken.connect(owner).stake(amount);

          await expect(stake)
            .to.emit(stakingToken, "Staked")
            .withArgs(owner.address, amount);
        });
      });

      describe("withdraw", () => {
        it("amount can't be zero", async () => {
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          expect(stakingToken.connect(owner).stake(0)).to.be.revertedWith(
            "amount = 0"
          );
        });

        it("balanceOf should decrease", async () => {
          const newAmount = amount * 2;
          await token
            .connect(owner)
            .approve(stakingToken.getAddress(), newAmount);
          await stakingToken.connect(owner).stake(newAmount);
          const beforeBalanceOf = await stakingToken.balanceOf(owner.address);
          await stakingToken.connect(owner).withdraw(amount);
          const afterBalanceOf = await stakingToken.balanceOf(owner.address);
          assert.equal(Number(afterBalanceOf) + amount, beforeBalanceOf);
        });

        it("totalSupply should decrease", async () => {
          const newAmount = amount * 2;
          await token
            .connect(owner)
            .approve(stakingToken.getAddress(), newAmount);
          await stakingToken.connect(owner).stake(newAmount);
          const beforeTotalSupply = await stakingToken.totalSupply();
          await stakingToken.connect(owner).withdraw(amount);
          const afterTotalSupply = await stakingToken.totalSupply();
          assert.equal(Number(afterTotalSupply) + amount, beforeTotalSupply);
        });

        it("amount cant be bigger than balance", async () => {
          const newAmount = amount * 2;
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(owner).stake(amount);
          await expect(
            stakingToken.connect(owner).withdraw(newAmount)
          ).to.be.revertedWith("Insufficient staked amount");
        });

        it("should emit withdraw event with correct data", async () => {
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(owner).stake(amount);
          const withdraw = await stakingToken.connect(owner).withdraw(amount);

          await expect(withdraw)
            .to.emit(stakingToken, "Withdraw")
            .withArgs(owner.address, amount);
        });
      });

      describe("earned", () => {
        it("should calculate true for stakingPeriod1", async () => {
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(owner).stake(amount);
          const currentTime1 = (await ethers.provider.getBlock("latest"))
            .timestamp;

          const rewardRate = await stakingToken.REWARD_RATE_1();
          const rewardTime = await stakingToken.stakingPeriod1();
          const BP = await stakingToken.BP();

          await time.increase(30);

          const userBalance = await stakingToken.balanceOf(owner.address);
          const currentTime2 = (await ethers.provider.getBlock("latest"))
            .timestamp;
          let calculate;
          if (Number(currentTime2) - Number(currentTime1) >= rewardTime) {
            calculate = (userBalance * rewardRate) / BP;
          }
          const earned = await stakingToken.earned(owner.address);
          assert.equal(calculate.toString(), earned.toString());
        });

        it("should calculate true for stakingPeriod2", async () => {
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(owner).stake(amount);
          const currentTime1 = (await ethers.provider.getBlock("latest"))
            .timestamp;

          const rewardRate = await stakingToken.REWARD_RATE_2();
          const rewardTime = await stakingToken.stakingPeriod1();
          const BP = await stakingToken.BP();

          await time.increase(55);

          const userBalance = await stakingToken.balanceOf(owner.address);
          const currentTime2 = (await ethers.provider.getBlock("latest"))
            .timestamp;
          let calculate;
          if (Number(currentTime2) - Number(currentTime1) >= rewardTime) {
            calculate = (userBalance * rewardRate) / BP;
          }
          const earned = await stakingToken.earned(owner.address);
          assert.equal(calculate.toString(), earned.toString());
        });

        it("should calculate true for stakingPeriod3", async () => {
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(owner).stake(amount);
          const currentTime1 = (await ethers.provider.getBlock("latest"))
            .timestamp;

          const rewardRate = await stakingToken.REWARD_RATE_3();
          const rewardTime = await stakingToken.stakingPeriod3();
          const BP = await stakingToken.BP();

          await time.increase(366);

          const userBalance = await stakingToken.balanceOf(owner.address);
          const currentTime2 = (await ethers.provider.getBlock("latest"))
            .timestamp;
          let calculate;
          if (Number(currentTime2) - Number(currentTime1) >= rewardTime) {
            calculate = (userBalance * rewardRate) / BP;
          }
          const earned = await stakingToken.earned(owner.address);
          assert.equal(calculate.toString(), earned.toString());
        });

        it("should calculate for zero reward", async () => {
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(owner).stake(amount);
          const currentTime1 = (await ethers.provider.getBlock("latest"))
            .timestamp;

          await time.increase(3);

          const currentTime2 = (await ethers.provider.getBlock("latest"))
            .timestamp;

          const earned = await stakingToken.earned(owner.address);
          assert.equal(0, earned.toString());
        });
      });

      describe("claimReward", () => {
        it("claimReward should work", async () => {
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(owner).stake(amount);

          const beforeUserBalance = await token.balanceOf(owner.address);

          await time.increase(365);
          const earned = await stakingToken.earned(owner.address);
          await stakingToken.connect(owner).claimReward();
          const afterUserBalance = await token.balanceOf(owner.address);
          assert.equal(beforeUserBalance + earned, afterUserBalance);
        });

        it("totalSupply is not enough", async () => {
          const newAmount = 900;
          await token
            .connect(owner)
            .approve(stakingToken.getAddress(), newAmount);
          await stakingToken.connect(owner).stake(newAmount);

          await token.connect(owner).transfer(account.address, amount);

          await token
            .connect(account)
            .approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(account).stake(99);

          await time.increase(30);

          await stakingToken.connect(owner).claimReward();
          await stakingToken.connect(owner).withdraw(newAmount);

          await time.increase(365);
          await expect(
            stakingToken.connect(account).claimReward()
          ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
        });

        it("reward should bigger than zero", async () => {
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(owner).stake(amount);

          await expect(
            stakingToken.connect(owner).claimReward()
          ).to.be.revertedWith("reward should bigger than zero");
        });

        it("lastStakeTime should update", async () => {
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(owner).stake(amount);
          const beforeClaim = await stakingToken
            .connect(owner)
            .getLastStakeTime(owner.address);
          await time.increase(30);
          await stakingToken.connect(owner).claimReward();

          const afterClaim = await stakingToken
            .connect(owner)
            .getLastStakeTime(owner.address);
          assert.notEqual(beforeClaim.toString(), afterClaim.toString());
        });

        it("total supply should decrease", async () => {
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(owner).stake(amount);

          const beforeTotalSupply = await stakingToken.totalSupply();
          await time.increase(30);
          const earned = await stakingToken.earned(owner.address);
          await stakingToken.connect(owner).claimReward();
          const afterTotalSupply = await stakingToken.totalSupply();

          assert.equal(afterTotalSupply + earned, beforeTotalSupply);
        });

        it("should emit RewardPaid event with correct data", async () => {
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(owner).stake(amount);
          await time.increase(30);
          const reward = await stakingToken.earned(owner.address);
          const claimReward = await stakingToken.connect(owner).claimReward();

          await expect(claimReward)
            .to.emit(stakingToken, "RewardPaid")
            .withArgs(owner.address, reward);
        });
      });
    });
