// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract Token is ERC20, ERC20Capped, ERC20Pausable, Ownable, ERC20Burnable {
    constructor() ERC20("Token", "TN") ERC20Capped(1_000_000) {
        _mint(msg.sender, 1_000);
    }

    function _mint(
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Capped) {
        require(
            totalSupply() + amount <= 1_000_000,
            "Max number of tokens minted"
        );
        super._mint(to, amount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Pausable) {
        super._beforeTokenTransfer(from, to, amount);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function mint(address account, uint256 amount) public onlyOwner {
        _mint(account, amount);
    }
}
