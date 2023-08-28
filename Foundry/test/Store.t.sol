// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import {Store} from "../src/Store.sol";
import {LimeTokenERC20} from "../src/LimeTokenERC20.sol";

contract StoreTest is Test {
    Store public store;
    LimeTokenERC20 public token;

    function setUp() public {
        token = new LimeTokenERC20();
        store = new Store(address(token));
    }

}