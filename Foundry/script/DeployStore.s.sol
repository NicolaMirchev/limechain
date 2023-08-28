// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {Script} from "forge-std/Script.sol";
import {Store} from "../src/TechnoLime.sol";
import {LimeTokenERC20} from "../src/LimeTokenERC20.sol";
import {ERC20Permit} from  "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract DeployStore is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        ERC20Permit token = new LimeTokenERC20();
        Store limeStore = new Store(address(token));
        vm.stopBroadcast();
    }
}