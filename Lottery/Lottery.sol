// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

import {Owner} from "contracts/Owner.sol";


library RandomLib{
    function pickRandom(uint256 length) internal view returns (uint256){
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, length)));
    }
}

/*
A lottary contract, which implement the following functionalities:
    - Everyone can enter with the amount of 0.01 ether.
    - Deployer of the contract is the manager, who is responsible to pick a winner when he decides.
    - When a winner is picked, the contract is reset and the lottery start from beginning.
*/
contract Lottery is Owner{

    event NewParticipant(address indexed par);
    event WinnerHasPicked(address indexed winner);

    address payable[] public participants;


    constructor()Owner(){
    } 

    function enterLottery() payable external { 
        require(msg.value == 0.01 ether, "Valid entrance fee is 0.01 ether");
        participants.push(payable(msg.sender));
        emit NewParticipant(msg.sender);
    }

    function pickWinner() onlyOwner external {
        require(participants.length > 0, "No particioants in the current run");

        address winner = participants[RandomLib.pickRandom(participants.length)];

        address payable[] memory newAddr;
        participants = newAddr;

        (bool success, ) = winner.call{value: address(this).balance}("");
        require(success);
        emit WinnerHasPicked(winner);
    }
}