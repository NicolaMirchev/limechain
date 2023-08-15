// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;


interface IStore {
    event ProductAdded(string indexed productId, uint256 quantiy);
    event ProductHasBeenSold(string indexed productId, address indexed buyer, uint256 quantity);

    // A product struct, which holds all required information about a given product.
    struct Product{
        // Name of the product
        string id;
        // Price per one in Wei
        uint256 price;
    }

    struct Purchase{
        uint256 blocktime;
        string productId;
        uint256 quantity;
    }

    // The function to be called only by the owner of the store. If there is already product with the given id, it's quantity is increased.
    function createProductOrAddQuantity(string calldata productId, uint256 quantity, uint256 price) external;

    // The function to be called by the clients of the store. If there is no product with such id, not enought quantity, or not enough money the transaction is reverted.
    function buyProduct(string calldata productId, uint256 quantity) payable external;

    // The function check wether the product is valid to be returned and return it if it is.
    function returnProduct(string calldata productId) external;

    // The function return all products and their availability. 
    function seeAvailableProducts() view external returns(Product[] memory);
}