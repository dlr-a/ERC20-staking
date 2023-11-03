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
          await expect(StakingToken.deploy(addressZero))
            .to.be.revertedWithCustomError(stakingToken, "InvalidAddress")
            .withArgs(addressZero);
        });
      });

      describe("Stake", () => {
        it("give reward when user already stakes", async () => {
          const newAmount = amount * 2;
          await token
            .connect(owner)
            .approve(stakingToken.getAddress(), newAmount);
          await stakingToken.stake(amount);
          await time.increase(50);
          const beforeUserBalance = await token.balanceOf(owner.address);
          const earned = await stakingToken.earned(owner.address);
          await stakingToken.stake(amount);
          const afterUserBalance = await token.balanceOf(owner.address);
          assert.equal(
            beforeUserBalance,
            Number(afterUserBalance) + (amount - Number(earned))
          );
        });

        it("amount can't be zero", async () => {
          await expect(stakingToken.stake(0)).to.be.revertedWith("amount = 0");
        });

        it("user balance should be bigger than amount", async () => {
          await token
            .connect(account)
            .approve(stakingToken.getAddress(), amount);
          const balance = await token.balanceOf(account.address);
          await expect(stakingToken.connect(account).stake(amount))
            .to.be.revertedWithCustomError(token, "ERC20InsufficientBalance")
            .withArgs(account.address, balance, amount);
        });

        it("user should allow", async () => {
          const allowance = await token.allowance(
            owner.address,
            stakingToken.getAddress()
          );
          const address = await stakingToken.getAddress();
          await expect(stakingToken.stake(amount))
            .to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance")
            .withArgs(address, allowance, amount);
        });

        it("balanceOf should increase", async () => {
          const newAmount = amount * 2;
          await token.approve(stakingToken.getAddress(), newAmount);
          await stakingToken.stake(amount);
          const beforeBalanceOf = await stakingToken.balanceOf(owner.address);
          await stakingToken.stake(amount);
          const afterBalanceOf = await stakingToken.balanceOf(owner.address);
          assert.equal(Number(afterBalanceOf) - amount, beforeBalanceOf);
        });

        it("contract balance should increase", async () => {
          await token.approve(stakingToken.getAddress(), amount);
          await stakingToken.stake(amount);
          const contractBalance = await token.balanceOf(
            stakingToken.getAddress()
          );
          assert.equal(amount.toString(), contractBalance.toString());
        });

        it("user token balance should decrease", async () => {
          const beforeUserBalance = await token.balanceOf(owner.address);
          await token.approve(stakingToken.getAddress(), amount);
          await stakingToken.stake(amount);
          const afterUserBalance = await token.balanceOf(owner.address);
          assert.equal(Number(afterUserBalance) + amount, beforeUserBalance);
        });

        it("updatedAt should update", async () => {
          await token.approve(stakingToken.getAddress(), amount);
          const beforeStake = await stakingToken.updatedAt(owner.address);
          await stakingToken.stake(amount);
          await time.increase(10);
          const afterStake = await stakingToken.updatedAt(owner.address);
          assert.notEqual(beforeStake, afterStake);
        });

        it("should emit stake event with correct data", async () => {
          await token.approve(stakingToken.getAddress(), amount);
          const stake = await stakingToken.stake(amount);

          await expect(stake)
            .to.emit(stakingToken, "Staked")
            .withArgs(owner.address, amount);
        });
      });

      describe("unStake", () => {
        it("balanceOf should decrease", async () => {
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(owner).stake(amount);
          const beforeBalanceOf = await stakingToken.balanceOf(owner.address);
          await stakingToken.connect(owner).unStake();
          const afterBalanceOf = await stakingToken.balanceOf(owner.address);
          assert.equal(Number(afterBalanceOf) + amount, beforeBalanceOf);
        });

        it("contract balance should decrease", async () => {
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(owner).stake(amount);
          const beforeContractBalance = await token.balanceOf(
            stakingToken.getAddress()
          );
          await stakingToken.connect(owner).unStake();
          const afterContractBalance = await token.balanceOf(
            stakingToken.getAddress()
          );
          assert.equal(
            Number(afterContractBalance) + amount,
            beforeContractBalance
          );
        });

        it("should emit unstake event with correct data", async () => {
          await token.connect(owner).transfer(account.address, amount);
          await token
            .connect(account)
            .approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(account).stake(amount);

          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(owner).stake(amount);
          await time.increase(30);
          const reward = await stakingToken.earned(owner.address);
          const unStake = await stakingToken.connect(owner).unStake();

          await expect(unStake)
            .to.emit(stakingToken, "UnStaked")
            .withArgs(owner.address, reward, amount);
        });

        it("should give reward", async () => {
          await token.connect(owner).transfer(account.address, amount);
          await token
            .connect(account)
            .approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(account).stake(amount);

          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(owner).stake(amount);
          const beforeUserBalance = await token.balanceOf(owner.address);
          await time.increase(30);

          const reward = await stakingToken.earned(owner.address);
          await stakingToken.connect(owner).unStake();
          const afterUserBalance = await token.balanceOf(owner.address);

          assert.equal(
            Number(beforeUserBalance) + Number(reward) + amount,
            Number(afterUserBalance)
          );
        });

        it("revert when contract balance is not enough", async () => {
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(owner).stake(amount);
          const balance = await token.balanceOf(stakingToken.getAddress());
          await time.increase(30);
          const reward = await stakingToken.earned(owner.address);
          const address = await stakingToken.getAddress();

          await expect(stakingToken.connect(owner).unStake())
            .to.be.revertedWithCustomError(token, "ERC20InsufficientBalance")
            .withArgs(address, balance - reward, amount);
          //contract balance is enough for reward and gives the reward to user.
          //but not enough for users stake amount
        });

        it("should delete updatedAt", async () => {
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(owner).stake(amount);

          await stakingToken.connect(owner).unStake();
          const updatedAt = await stakingToken.updatedAt(owner.address);
          assert.equal(0, updatedAt);
        });

        it("when reward is zero", async () => {
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(owner).stake(amount);
          const beforeUserBalance = await token.balanceOf(owner.address);

          await stakingToken.connect(owner).unStake();
          const afterUserBalance = await token.balanceOf(owner.address);

          assert.equal(Number(beforeUserBalance) + amount, afterUserBalance);
        });
      });

      describe("harvest", () => {
        it("harvest works", async () => {
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(owner).stake(amount);
          await time.increase(30);

          const beforeOwnerBalance = await token.balanceOf(owner.address);
          const earned = await stakingToken.earned(owner.address);
          await stakingToken.connect(owner).harvest();
          const afterOwnerBalance = await token.balanceOf(owner.address);
          assert.equal(afterOwnerBalance, beforeOwnerBalance + earned);
        });

        it("harvest should update updatedAt", async () => {
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(owner).stake(amount);
          const beforeUpdatedAt = await stakingToken.updatedAt(owner.address);
          await time.increase(30);
          await stakingToken.connect(owner).harvest();
          const afterUpdatedAt = await stakingToken.updatedAt(owner.address);
          assert.notEqual(beforeUpdatedAt, afterUpdatedAt);
        });

        it("should revert when reward is zero", async () => {
          await token.connect(owner).approve(stakingToken.getAddress(), amount);
          await stakingToken.connect(owner).stake(amount);

          await expect(
            stakingToken.connect(owner).harvest()
          ).to.be.revertedWithCustomError(stakingToken, "RewardIsZero");
        });
      });

      describe("earned", () => {
        it("account cant be address zero", async () => {
          await expect(stakingToken.earned(addressZero))
            .to.be.revertedWithCustomError(stakingToken, "InvalidAddress")
            .withArgs(addressZero);
        });

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
          await time.increase(3);

          const earned = await stakingToken.earned(owner.address);
          assert.equal(0, earned.toString());
        });
      });
    });
