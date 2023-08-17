// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;



/* Owner contract, which specifies owner functionality. (to be inferited)
*/
contract Owner{
    address public owner;


    modifier onlyOwner(){
        require(msg.sender == owner, "Unauthorized");
        _;
    }

    constructor(){
        owner = msg.sender;
    }

    function changeOwner(address _owner) onlyOwner external {
        owner = _owner;
    }

}