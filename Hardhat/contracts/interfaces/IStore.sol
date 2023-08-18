// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;


interface IStore {
    event ProductAdded(string indexed productId, uint256 quantiy);
    event ProductQuantityAdded(string indexed productId, uint256 quantity);
    event ProductHasBeenSold(string indexed productId, address indexed buyer);
    event ProductHasBeenReturned(string indexed productId, address indexed buyer);

    // A product struct, which holds all required information about a given product.
    struct Product{
        /// Name of the product
        string id;
        /// Price per one in Wei
        uint256 price;
        /// Quantity in shop
        uint256 quantity;
    }

    // The function to be called only by the owner of the store. If there is already product with the given id, it's quantity is increased.
    function createProductOrAddQuantity(string calldata productId, uint256 quantity, uint256 price) external;
    // The function to be called by the clients of the store. If there is no product with such id, not enought quantity, or not enough money the transaction is reverted.
    function buyProduct(string calldata productId) payable external;
    // The function check wether the product is valid to be returned and return it if it is.
    function returnProduct(string calldata productId) external;
    /// Next two functions are used for the iterable mapping functionallity.
    function getProductsCount() view external returns(uint256);
    function getProductAtIndex(uint256 index) view external returns(Product memory);
    // The function return all products, which are currenlty available . 
    // * Client can use returned data (productId) to check exact availability for given product.
    function seeProductsInShop() view external returns(Product[] memory);
    // The function returns collection of addresses of all users that have bought some products.
    function getBuyers() external view returns (address[] memory);
}