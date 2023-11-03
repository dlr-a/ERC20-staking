// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

error TransactionFailed(address _address);
error InvalidAddress(address _address);
error RewardIsZero();

contract ERC20Staking is Ownable {
    IERC20 public immutable stakingToken;

    uint256 public stakingPeriod1 = 30 seconds;
    uint256 public stakingPeriod2 = 50 seconds;
    uint256 public stakingPeriod3 = 365 seconds;

    uint256 public constant REWARD_RATE_1 = 1_000;
    uint256 public constant REWARD_RATE_2 = 2_000;
    uint256 public constant REWARD_RATE_3 = 3_000;
    uint256 public constant BP = 10_000;

    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public updatedAt;

    event Staked(address indexed user, uint256 amount);
    event UnStaked(address indexed user, uint256 reward, uint256 withdraw);

    constructor(address _stakingToken) Ownable(msg.sender) {
        if (_stakingToken == address(0)) {
            revert InvalidAddress(address(0));
        }
        stakingToken = IERC20(_stakingToken);
    }

    function earned(address _account) public view returns (uint256) {
        if (_account == address(0)) {
            revert InvalidAddress(address(0));
        }
        uint256 userStakingTime = block.timestamp - updatedAt[_account];
        uint256 rewardRate;

        if (userStakingTime >= stakingPeriod3) {
            rewardRate = REWARD_RATE_3;
        } else if (userStakingTime >= stakingPeriod2) {
            rewardRate = REWARD_RATE_2;
        } else if (userStakingTime >= stakingPeriod1) {
            rewardRate = REWARD_RATE_1;
        }

        if (rewardRate == 0) return 0;

        return (balanceOf[_account] * rewardRate) / BP;
    }

    function stake(uint _amount) external {
        if (balanceOf[msg.sender] != 0) {
            uint256 userReward = earned(msg.sender);
            stakingToken.transfer(msg.sender, userReward);
        }
        require(_amount > 0, "amount = 0");
        stakingToken.transferFrom(msg.sender, address(this), _amount);
        balanceOf[msg.sender] += _amount;
        updatedAt[msg.sender] = block.timestamp;
        emit Staked(msg.sender, _amount);
    }

    function unStake() external {
        uint256 reward = earned(msg.sender);
        if (reward > 0) {
            stakingToken.transfer(msg.sender, reward);
        }
        delete updatedAt[msg.sender];
        uint256 balance = balanceOf[msg.sender];
        stakingToken.transfer(msg.sender, balance);
        delete balanceOf[msg.sender];
        emit UnStaked(msg.sender, reward, balance);
    }

    function harvest() external {
        uint256 reward = earned(msg.sender);
        if (reward > 0) {
            stakingToken.transfer(msg.sender, reward);
            updatedAt[msg.sender] = block.timestamp;
        } else {
            revert RewardIsZero();
        }
    }
}
