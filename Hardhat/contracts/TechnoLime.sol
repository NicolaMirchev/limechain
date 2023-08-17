// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import {Owner} from "./Owner.sol";
import {IStore} from "./interfaces/IStore.sol";
import {StringComparator} from "./libraries/StringComparator.sol";



/*
- The administrator (owner) of the store should be able to add new products and the quantity of them. ++++
- The administrator should not be able to add the same product twice, just quantity.  ++++
- Buyers (clients) should be able to see the available products and buy them by their id. ++++ 
- Buyers should be able to return products if they are not satisfied (within a certain period in blocktime: 100 blocks).
- A client cannot buy the same product more than one time.
- The clients should not be able to buy a product more times than the quantity in the store unless a product is returned or added by the administrator (owner)
- Everyone should be able to see the addresses of all clients that have ever bought a given product.
*/



contract Store is Owner, IStore{     
    using StringComparator for string;

    error ProductNotFound(string productName);


    // Key is the id of the product and the value is the availability in the shop.
    mapping(string => uint256) public productAvailability;
    // Key is the id of the product which is pointing on an existing instance with valid data.
    mapping(string => Product) private productProperties;
    Product[] productsInShop;

    // The mapping key is user address and the value a mapping in which the key is the id of the product
    // and the value is the timeblock in which he has purchased the product (When it is zero, the client has not bought this product)
    mapping(address => mapping(string => uint256)) public clientPurchases;

    // The mapping holds information wether user has returned given product.
    mapping(address => mapping(string => bool)) private hasReturned; 
    address[] public buyers;
    
    constructor()Owner(){}

    function createProductOrAddQuantity(string calldata productId, uint256 quantity, uint256 price) onlyOwner external{
        if(productProperties[productId].id.compare("")){
            Product memory product =  Product(productId, price);
            productProperties[productId] = product;
            productsInShop.push(product);

            emit ProductAdded(productId, quantity);
        }
        else{
            emit ProductQuantityAdded(productId, quantity);
        }
        productAvailability[productId] += quantity;
    }


    function buyProduct(string calldata productId) payable external{
        // ------ Checks
        
        if(productProperties[productId].id.compare("")) revert ProductNotFound(productId);
        require(productAvailability[productId] > 0 , "Not enough quantity") ;
        // Haven't buy the same product before
        require(clientPurchases[msg.sender][productId] == 0, "Cannot buy tha same product twise");

        uint256 price = productProperties[productId].price;
        require(price <= msg.value,"Not enough money");
        
        // ------ Change state variables
        --productAvailability[productId];

        clientPurchases[msg.sender][productId] = block.number;
        buyers.push(msg.sender);
         // Return rest of the provided funds to the user.
        payable(msg.sender).transfer(msg.value - price);


        emit ProductHasBeenSold(productId, msg.sender);
    }

    
    function returnProduct(string calldata productId) external{
        // Check if msg.sender has purchased this product.
        // Here we have invariant of always valid product
        // If the productId is invalid or wrong, the below check will fail.
        uint256 purchasedBlock = clientPurchases[msg.sender][productId];
        require(purchasedBlock != 0, "The product has never bought");
        // Check if the quantity which he is trying to return is not more than the purchased.
       
        require(!hasReturned[msg.sender][productId], "User has already returned the given stock");
        // Check the block number. Less than 100 blocks from the one, in which the product was purchased.
        require(block.number - purchasedBlock >= 0, "More than 100 blocks has passed from the purchase.");
        // Change state variables (Upgrade product in shop, upgrade returned quantity for the Purchase).

        ++productAvailability[productId];
        hasReturned[msg.sender][productId] = true;
        // Return the money to the buyer.
        payable(msg.sender).transfer(productProperties[productId].price);

        emit ProductHasBeenReturned(productId, msg.sender);
    }

    function seeProductsInShop() view external returns(Product[] memory){
        return productsInShop;
    }

    function getBuyers() external view returns (address[] memory){
        return buyers;
    }
}