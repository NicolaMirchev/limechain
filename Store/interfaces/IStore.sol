// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;


interface IStore {
    event ProductAdded(string indexed productId, uint256 quantiy);
    event ProductQuantityAdded(string indexed productId, uint256 quantity);
    event ProductHasBeenSold(string indexed productId, address indexed buyer);
    event ProductHasBeenReturned(string indexed productId, address indexed buyer);

    /// @notice A product struct, which holds all required information about a given product.
    struct Product{
        /// @dev Name of the product
        string id;
        /// @dev Price per one in Wei
        uint256 price;
    }

     /** 
     * @notice  . The function to be called only by the owner of the store. If there is already product with the given id, it's quantity is increased.
     * @dev     . If a product that has previously added is passed again, the 'price' is ignored and quantity is only added
     * @param   productId  . name of the product
     * @param   quantity  . how much of the given product to add 
     * @param   price  . for a single unit of the product
     */
    function createProductOrAddQuantity(string calldata productId, uint256 quantity, uint256 price) external;

      
    /**
     * @notice  . The function to be called by the clients of the store. If there is no product with such id, not enought quantity, the buyer has already bought this item, or not enough money the transaction is reverted.
     * @dev     . Currently the owner is able to purchase products (Think from business perspective if it is okay)
     * @param   productId  . name of the product
     */
    function buyProduct(string calldata productId) payable external;

      
    /**
     * @notice  . The function check wether the product is valid to be returned and return it if it is.
     * @dev     . If the function is successfull, then: product vailability is increased, money is returned to the user.  
     * @param   productId  .
     */
    function returnProduct(string calldata productId) external;

    // The function return all products, which are currenlty available . 
    // * Client can use returned data (productId) to check exact availability for given product.

    
    /** 
     * @notice  . See all products, which have ever been added to the shop.
     * @dev     . 
     * @return  . collection of the products.
     */
    function seeProductsInShop() view external returns(Product[] memory);
    
    /**
     * @notice  . See all addresses, that have ever purchased something from the shop.
     * @return  address[]  buyers.
     */
    function getBuyers() external view returns (address[] memory);
}