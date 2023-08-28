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

    /**
     * @notice  . The function to be called only by the owner of the store. 
     * @dev     . If there is already product with the given id, the price is ignored and only it's quantity is increased.
     * @param   productId  . name of the product
     * @param   quantity  . to be added for this product
     * @param   price  . for single unit of the given product
     */
    function createProductOrAddQuantity(string calldata productId, uint256 quantity, uint256 price) external;
    
    /**
     * @notice  . The function to be called by the clients of the store. If there is no product with such id, not enought       quantity, or not enough money the transaction is being reverted.
     * @param   productId  . name of the product to be purchased.
     */
    function buyProduct(string calldata productId) external;


    /**
     * @notice  . The function buy product on behalf of user, using signed message.
     * @dev     . All passed in params should correspond to their hashed values inside the signature. If there is mismatch,
     * the signer won't be obtained correctly.
     * @param   productId  . id of the product
     * @param   spendingAmount  . which the signed approve contract to use
     * @param   deadline  . passed to the permit function
     * @param   r, s, v  . signed message from the original user. The message consist of permiting the contract to use 
       original signer resources following EIP712 typeSignedHash structure. 
     */
    function buyProductWithSignature(string calldata productId, address spender,uint256 spendingAmount,uint256 deadline, bytes32 r, bytes32 s, uint8 v) external;
    
    /**
     * @notice  . The function check wether the product is valid to be returned and return it if it is.
     * @dev     . If the product is does not meet requirements to be returned - the transaction has been reverted.
     * @param   productId  . name of the product to return.
     */
    function returnProduct(string calldata productId) external;
    
    /// @dev Next two functions are used for the iterable mapping functionallity.
    /** 
     * @notice  . The function returns the count of all products in the store.
     * @dev     . If the quantity for given product is 0, it is again counted.
     * @return  . count of the products
     */
    function getProductsCount() view external returns(uint256);
    /**
     * @notice  . The function returns a product at a given index in the array of products.
     * @dev . The transaction is reverted if the index is invalid
     * @param   index  . of the product in the array. In which place it was added.
     * @return . the product
     */
    function getProductAtIndex(uint256 index) view external returns(Product memory);

    /**
     * @notice  . The function returns collection of addresses of all users that have bought some products.
     * @return  address[]  . all buyers.
     */
    function getBuyers() external view returns (address[] memory);
}