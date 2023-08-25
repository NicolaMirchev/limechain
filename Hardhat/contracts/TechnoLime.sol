// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import {Owner} from "./Owner.sol";
import {IStore} from "./interfaces/IStore.sol";
import {StringComparator} from "./libraries/StringComparator.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20Permit} from  "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";



/*
- The administrator (owner) of the store should be able to add new products and the quantity of them. ++++
- The administrator should not be able to add the same product twice, just quantity.  ++++
- Buyers (clients) should be able to see the available products and buy them by their id. ++++ 
- Buyers should be able to return products if they are not satisfied (within a certain period in blocktime: 100 blocks).
- A client cannot buy the same product more than one time.
- The clients should not be able to buy a product more times than the quantity in the store unless a product is returned or added by the administrator (owner)
- Everyone should be able to see the addresses of all clients that have ever bought a given product.
*/



/** 
 * @author  . Nikola Mirchev
 * @title   . Store
 * @notice  . A store contract provides logic for buyers and shop manager.
 * The manager can : add products with quantity, increase their quantity and change the manager(owner) of the store.
 * Clients can: purchase only one quantity of given product using the native currency of the blockchain (ethers), see 
 * the availability of the products inside the store and return products, if less time than return limit has passed.
 */

contract Store is Owner, IStore{     
    using StringComparator for string;

    error ProductNotFound(string productName);

    /// @dev . Key is the id of the product which is pointing on an existing instance with valid data.
    mapping(string => Product) public productProperties;
  
    /// @dev . The mapping key is user address and the value a mapping in which the key is the id of the product
    // and the value is the timeblock in which he has purchased the product (When it is zero, the client has not bought this product)
    mapping(address => mapping(string => uint256)) public clientPurchases;

    /// @dev The mapping holds information wether user has returned given product.
    mapping(address => mapping(string => bool)) private hasReturned; 
    address[] public buyers;
    /// @dev Ids of of the products in the mapping
    string[] private productsInShop;

    ERC20Permit public immutable tokenContract;

    modifier buyProductChecks(string calldata productId,address buyer) {
        Product memory product = productProperties[productId];
        
        if(product.id.compare("")) revert ProductNotFound(productId);
        require(product.quantity > 0 , "Not enough quantity");
        /// @dev Haven't buy the same product before
        require(clientPurchases[msg.sender][productId] == 0, "Cannot buy the same product twise");
        _;
    }
    
    constructor(address tokenAddress)Owner(){
        tokenContract = ERC20Permit(tokenAddress);
    }
    
    function createProductOrAddQuantity(string calldata productId, uint256 quantity, uint256 price) onlyOwner external{
        if(productProperties[productId].id.compare("")){
            Product memory product =  Product(productId, price, quantity);
            productProperties[productId] = product;
            productsInShop.push(productId);

            emit ProductAdded(productId, quantity);
        }
        else{
            emit ProductQuantityAdded(productId, quantity);
            productProperties[productId].quantity += quantity;
        }
    }


    function buyProduct(string calldata productId) buyProductChecks(productId, msg.sender) external{
        /// ------ Checks
        uint256 productPrice = productProperties[productId].price;
        require(tokenContract.allowance(msg.sender, address(this)) >= productPrice ,"Not enough money");
        
        /// ------ Change state variables
        _buyProduct(productId, msg.sender, productPrice);
    }

    function buyProductWithSignature(string calldata productId, address spender, uint256 spendingAmount ,uint256 deadline,bytes32 r, bytes32 s, uint8 v
    )
    buyProductChecks(productId, spender) external{                
         // Signed message should contrain permition from signer to this contract to spend the resources
        tokenContract.permit(spender, address(this), spendingAmount, deadline, v, r, s);

        uint256 productPrice = productProperties[productId].price;
        require(tokenContract.allowance(spender, address(this)) >= productPrice ,"Not enough money");
   
        _buyProduct(productId, spender, productPrice);
    }
    
    function returnProduct(string calldata productId) external{
        /// @dev Check if msg.sender has purchased this product.
        /*  
         Here we have invariant of always valid product
         If the productId is invalid or wrong, the below check will fail. 
         */
        uint256 purchasedBlock = clientPurchases[msg.sender][productId];
        require(purchasedBlock != 0, "The product has never bought");
        /// @dev Check if the quantity which he is trying to return is not more than the purchased.
       
        require(!hasReturned[msg.sender][productId], "Client has already returned the given stock");
        /// @dev Check the block number. Less than 100 blocks from the one, in which the product was purchased.
        require(block.number - purchasedBlock < 100, "More than 100 blocks has passed from the purchase");
        /// @dev Change state variables (Upgrade product in shop, upgrade returned quantity for the Purchase).

        ++productProperties[productId].quantity;
        hasReturned[msg.sender][productId] = true;
        /// @dev Return the money to the buyer. 80% of the value.
        uint256 returnValue = productProperties[productId].price * 80 / 100;
        tokenContract.transfer(msg.sender, returnValue);


        emit ProductHasBeenReturned(productId, msg.sender);
    }

    function seeProductsInShop() view external returns(Product[] memory){
        uint256 productsCount = getProductsCount();
        Product[] memory products = new Product[](productsCount);
        for(uint256 i = 0; i < productsCount; ++i){
            products[i] = getProductAtIndex(i);
        }
        return products;
    }

    function getBuyers() external view returns (address[] memory){
        return buyers;
    }

    function _buyProduct(string calldata productId, address buyer,  uint256 price) private {
        --productProperties[productId].quantity;

        clientPurchases[buyer][productId] = block.number;
        buyers.push(buyer);
        (bool success) = tokenContract.transferFrom(buyer, address(this), price);
       
        require(success, "Token transfer has failed!");
        emit ProductHasBeenSold(productId, buyer);
    }

    function getProductsCount() view public returns(uint256){
        return productsInShop.length;
    }
    function getProductAtIndex(uint256 index) view public returns(Product memory){
        return productProperties[productsInShop[index]];
    }
}