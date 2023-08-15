// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import {Owner} from "contracts/Owner.sol";
import {IStore} from "contracts/interfaces/IStore.sol";


/*
- The administrator (owner) of the store should be able to add new products and the quantity of them. ++++
- The administrator should not be able to add the same product twice, just quantity.  ++++
- Buyers (clients) should be able to see the available products and buy them by their id. ++++ 
- Buyers should be able to return products if they are not satisfied (within a certain period in blocktime: 100 blocks).
- A client cannot buy the same product more than one time.
- The clients should not be able to buy a product more times than the quantity in the store unless a product is returned or added by the administrator (owner)
- Everyone should be able to see the addresses of all clients that have ever bought a given product.
*/

// String comparator library to check whether a string matches other string.
library StringComparator{
    function compare(string memory str1, string memory str2) public pure returns (bool) {
       if (bytes(str1).length != bytes(str2).length) {
            return false;
        }
        return keccak256(abi.encodePacked(str1)) == keccak256(abi.encodePacked(str2));
    }
}

contract Store is Owner, IStore{     
    using StringComparator for string;

    error ProductNotFound(string productName);

    // Key is the id of the product and the value is the availability in the shop.
    mapping(string => uint256) productAvailability;
    Product[] productsInShop;
    mapping(address => Purchase[]) public clientPurchases;
    
  
    constructor()Owner(){}

    function createProductOrAddQuantity(string calldata productId, uint256 quantity, uint256 price) onlyOwner external{
        if(findProductIndex(productId) == -1){
            Product memory product =  Product(productId, price);
            productsInShop.push(product);
        }
        productAvailability[productId] += quantity;
        emit ProductAdded(productId, quantity);
    }


    function buyProduct(string calldata productId, uint256 quantity) payable external{
        // ------ Checks
        int productIndex = findProductIndex(productId);
        if(productIndex == -1) revert ProductNotFound(productId);
        require(quantity > productAvailability[productId], "Not enough quantity") ;
        // Haven't buy the same product before
        require(findPurchaseIndex(productId, msg.sender) != -1, "Cannot buy tha same product twise");

        uint256 totalPrice = productsInShop[uint(productIndex)].price * quantity;
        require(totalPrice <= msg.value,"Not enough money");
        
        // ------ Change state variables
        productAvailability[productId] -= quantity;
        Purchase memory purchase = Purchase(block.number, productId, quantity);
        clientPurchases[msg.sender].push(purchase);

        emit ProductHasBeenSold(productId, msg.sender, quantity);
    }

    function returnProduct(string calldata productId) external{

    }

    function seeAvailableProducts() view external returns(Product[] memory){

    }

    function checkAvailability(address buyer) private view {

    }

    // Find a product in the array of products if it exist an return it's index. Otherwise returns -1.
    function findProductIndex(string calldata name) private view returns (int){
        for(uint i = 0; i< productsInShop.length;++i){
            if(name.compare(productsInShop[i].id)){
                return int(i);
            }
        }
        return -1;
    }

    // Find a purchase in the array of purchases if it exist an return it's index. Otherwise returns -1.
    function findPurchaseIndex(string calldata productName, address buyer) private view returns (int){
        Purchase[] memory purchases = clientPurchases[buyer];

        for(uint i = 0; i < purchases.length; ++i){
            if(productName.compare(purchases[i].productId)){
                return int(i);
            }
        }
        return -1;
    }
}