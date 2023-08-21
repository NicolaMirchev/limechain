// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Owner} from "./Owner.sol";

/**
 * @author  . Nikola Mirchev
 * @title   . LimeToken, 
 * @dev     . Current implementation for minting token allows the deployer of this contract to mint tokens for different accounts.
 * The economics are in his hands (off chain)
 * @notice  . The contract implements ERC20 interface and it is used as a currency to purchase stock from the TechnoLime Store.
 */

contract LimeToken is ERC20, Owner { 
    constructor()Owner() ERC20("LimeToken", "LMT") {}

    /**
     * @notice  . The owner of the contract can mint LMT tokens when he finds it appropriate.
     * @param   user  . User for whom are the tokens minted.
     * @param   amount  . Minted amount.
     */
    function mint(address user, uint256 amount) public onlyOwner(){
        _mint(user, amount);
    }
}