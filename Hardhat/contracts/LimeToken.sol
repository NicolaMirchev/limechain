// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Owner} from "./Owner.sol";

contract LimeToken is ERC20, Owner { 
    constructor()Owner() ERC20("LimeToken", "LMT") {}

    function mint(address user, uint256 amount) public onlyOwner(){
        _mint(user, amount);
    }
}