// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract ERC20Staking is Ownable {
    IERC20 public immutable stakingToken;

    uint256 public stakingPeriod1 = 30 seconds;
    uint256 public stakingPeriod2 = 50 seconds;
    uint256 public stakingPeriod3 = 365 seconds;

    uint256 public constant REWARD_RATE_1 = 1_000;
    uint256 public constant REWARD_RATE_2 = 2_000;
    uint256 public constant REWARD_RATE_3 = 3_000;
    uint256 public constant BP = 10_000;

    uint256 public totalSupply;

    mapping(address => uint256) public rewards;
    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public lastStakeTime;

    event Staked(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);

    constructor(address _stakingToken) {
        require(
            _stakingToken != address(0),
            "Token address can't be address zero"
        );
        stakingToken = IERC20(_stakingToken);
    }

    function getLastStakeTime(address _account) public view returns (uint256) {
        return lastStakeTime[_account];
    }

    function earned(address _account) public view returns (uint256 userReward) {
        if (block.timestamp - lastStakeTime[_account] >= stakingPeriod3) {
            userReward = (balanceOf[_account] * REWARD_RATE_3) / BP;
        } else if (
            block.timestamp - lastStakeTime[_account] >= stakingPeriod2
        ) {
            userReward = (balanceOf[_account] * REWARD_RATE_2) / BP;
        } else if (
            block.timestamp - lastStakeTime[_account] >= stakingPeriod1
        ) {
            userReward = (balanceOf[_account] * REWARD_RATE_1) / BP;
        } else {
            userReward = 0;
        }
    }

    function stake(uint _amount) external {
        require(_amount > 0, "amount = 0");
        stakingToken.transferFrom(msg.sender, address(this), _amount);
        balanceOf[msg.sender] += _amount;
        totalSupply += _amount;
        lastStakeTime[msg.sender] = block.timestamp;
        emit Staked(msg.sender, _amount);
    }

    function withdraw(uint _amount) external {
        require(_amount > 0, "amount = 0");
        require(balanceOf[msg.sender] >= _amount, "Insufficient staked amount");
        balanceOf[msg.sender] -= _amount;
        totalSupply -= _amount;
        stakingToken.transfer(msg.sender, _amount);
        emit Withdraw(msg.sender, _amount);
    }

    function claimReward() external {
        rewards[msg.sender] = earned(msg.sender);
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "reward should bigger than zero");
        delete rewards[msg.sender];
        lastStakeTime[msg.sender] = block.timestamp;
        stakingToken.transfer(msg.sender, reward);
        totalSupply -= reward;
        emit RewardPaid(msg.sender, reward);
    }
}
