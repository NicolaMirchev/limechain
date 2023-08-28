// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;


/// @dev String comparator library to check whether a string matches other string.
library StringComparator { 
    function compare(string memory str1, string memory str2) public pure returns (bool) {
       if (bytes(str1).length != bytes(str2).length) {
            return false;
        }
        return keccak256(abi.encodePacked(str1)) == keccak256(abi.encodePacked(str2));
    }
}