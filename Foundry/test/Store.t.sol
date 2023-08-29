// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import {Store} from "../src/Store.sol";
import {IStore} from "../src/interfaces/IStore.sol";
import {LimeTokenERC20} from "../src/LimeTokenERC20.sol";
import {SigUtils} from "./Utils.sol";

contract StoreTest is Test {
    struct DomainData {
        string name;
        string version;
        uint256 chainId;
        address veryfyingContract;
    }


    event ProductAdded(string indexed productId, uint256 quantiy);
    event ProductQuantityAdded(string indexed productId, uint256 quantity);
    event ProductHasBeenSold(string indexed productId, address indexed buyer);
    event ProductHasBeenReturned(string indexed productId, address indexed buyer);


    Store public store;
    LimeTokenERC20 public token;
    SigUtils public sigUtils;

    //  ----- Store stock -----

    string public constant BIKE = "bike";
    uint256 public constant BIKE_QUANTITY = 5;
    uint256 public constant BIKE_PRICE = 2000;
    string public constant BALL = "ball";
    uint256 public constant BALL_QUANTITY = 10;
    uint256 public constant BALL_PRICE = 500;
    string public constant BOOK = "book";
    uint256 public constant BOOK_QUANTITY = 2;
    uint256 public constant BOOK_PRICE = 550;

    uint256 public constant WHALE_PRIVATE_KEY = 97543; 
    address public immutable userWithTokens = vm.addr(WHALE_PRIVATE_KEY);   // In the setup 5000 LimeTokens are being minted for this user.


    function setUp() public {
        token = new LimeTokenERC20();
        store = new Store(address(token));

        token.mint(userWithTokens, 5000);
    }

    function _fillStoreWithProducts() internal {
        store.createProductOrAddQuantity(BIKE, BIKE_QUANTITY, BIKE_PRICE);
        store.createProductOrAddQuantity(BALL, BALL_QUANTITY, BALL_PRICE);
        store.createProductOrAddQuantity(BOOK, BOOK_QUANTITY, BOOK_PRICE);
    }


    function _signPermit(address owner, address spender, uint256 value, uint256 nonce, uint256 deadline) internal returns (uint8 v, bytes32 r, bytes32 s){
    SigUtils.Permit memory permit = SigUtils.Permit(owner, spender, value, nonce, deadline);

    sigUtils = new SigUtils(token.DOMAIN_SEPARATOR());
    bytes32 digest =  sigUtils.getTypedDataHash(permit);

    return vm.sign(WHALE_PRIVATE_KEY, digest);
    }

    // ----- STORE CREATON -----

    function test_succesfullyDeployedWithRightOwner() external{
        assertEq(address(this), store.owner());
    }

    function test_ownerAddProductsAndQuantityToTheStoreAndEmmitEvent() external{
        assertEq(store.seeProductsInShop().length, 0);

        vm.expectEmit();
        emit ProductAdded(BALL, BALL_QUANTITY);
        store.createProductOrAddQuantity(BALL, BALL_QUANTITY, BALL_PRICE);

        vm.expectEmit();
        emit ProductQuantityAdded(BALL, BALL_QUANTITY);
        store.createProductOrAddQuantity(BALL, BALL_QUANTITY, BALL_PRICE);

        assertEq(store.seeProductsInShop().length, 1);

    }

    function test_ownerCouldBeChanged() external{
        store.changeOwner(userWithTokens);

        assertEq(store.owner(),userWithTokens);
    }

    // ----- CLIENT INTERACTIONS WITH THE STORE -----
    function test_successfullyPurchasedProduct() external{
        _fillStoreWithProducts();

        vm.startPrank(userWithTokens);
        token.approve(address(store), BIKE_PRICE);
        vm.expectEmit();
        emit ProductHasBeenSold(BIKE, userWithTokens);
        store.buyProduct(BIKE);
        vm.stopPrank();

        assertEq(store.buyers(0), userWithTokens);
        (,,uint256 quantity) = store.productProperties(BIKE);
        assertEq(quantity, BIKE_QUANTITY - 1);
        uint256 balance = token.balanceOf(address(store));
        assertTrue(balance == BIKE_PRICE); 
    }

    function test_shouldRevertWhenNotOwnerIsTryingToAddProduct() external{
        _fillStoreWithProducts();

        address poor = makeAddr("PoorGuy");
        vm.startPrank(poor);
        vm.expectRevert("Unauthorized");
        store.createProductOrAddQuantity(BIKE, BIKE_QUANTITY, BIKE_PRICE);

    }
    function test_shouldRevertIfUserTryToBuyProductWhichDoesNotExist() external{
        vm.startPrank(userWithTokens);
        token.approve(address(store), BIKE_PRICE);
        vm.expectRevert(abi.encodeWithSelector(Store.ProductNotFound.selector, "Random"));
        store.buyProduct("Random");

    }

    function test_shouldRevertIfUserTryToBuyProductMoreThanOnce() external{
        _fillStoreWithProducts();
        vm.startPrank(userWithTokens);
        token.approve(address(store), BIKE_PRICE);
        store.buyProduct(BIKE);

        vm.expectRevert("Cannot buy the same product twise");
        store.buyProduct(BIKE);
        vm.stopPrank();
    }

    function test_shouldRevertIfUserDoesNotHaveEnoughtMoney() external{
        _fillStoreWithProducts();

        address poor = makeAddr("PoorGuy");
        vm.startPrank(poor);
        vm.expectRevert("Not enough money");
        store.buyProduct(BIKE);

    }

    function test_itIsPossibleToReturnProductInTheTermsPeriod() external{
        _fillStoreWithProducts();

        vm.startPrank(userWithTokens);
        token.approve(address(store), BIKE_PRICE);
        store.buyProduct(BIKE);

        vm.expectEmit();
        emit ProductHasBeenReturned(BIKE, userWithTokens);
        store.returnProduct(BIKE);
        vm.stopPrank();

        (,,uint256 quantity) = store.productProperties(BIKE);
        assertEq(quantity, BIKE_QUANTITY); 

        // After the return
        uint256 twentyPercentOfTheBikePrice = 400;
        assertEq(token.balanceOf(address(store)), twentyPercentOfTheBikePrice);
    }

     function test_itShouldRevertWhenUserTriesToReturnReturnedProduct() external{
        _fillStoreWithProducts();

        vm.startPrank(userWithTokens);
        token.approve(address(store), BIKE_PRICE);
        store.buyProduct(BIKE);
        store.returnProduct(BIKE);

        vm.expectRevert("Client has already returned the given stock");
        store.returnProduct(BIKE);
        vm.stopPrank();
    }

    function test_shouldRevertIfUserTryToReturnProductAfterTheTermsPeriod() external{
        _fillStoreWithProducts();

        vm.startPrank(userWithTokens);
        token.approve(address(store), BIKE_PRICE);
        store.buyProduct(BIKE);
        vm.roll(101);

        vm.expectRevert("More than 100 blocks has passed from the purchase");
        store.returnProduct(BIKE);
        vm.stopPrank();
    }

    function test_storeShouldReturnCorrectCountOfProducts() external{
        _fillStoreWithProducts();
        assertEq(store.getProductsCount(),3);
    }
    function test_storeShouldReturnCorrectProductCollection() external{
        _fillStoreWithProducts();

        IStore.Product memory bike = store.seeProductsInShop()[0];
        IStore.Product memory book = store.seeProductsInShop()[2];
        assertEq(bike.id, BIKE);
        assertEq(bike.quantity, BIKE_QUANTITY);
        assertEq(book.id, BOOK);
        assertEq(book.quantity, BOOK_QUANTITY);
    }

    function test_storeShouldReturnCorrectBuyerCollection() external {
        _fillStoreWithProducts();

        vm.startPrank(userWithTokens);
        token.approve(address(store), BIKE_PRICE + BALL_PRICE);
        store.buyProduct(BIKE);
        store.buyProduct(BALL);
        vm.stopPrank();
        address buyer = store.buyers(1);
        assertEq(buyer, userWithTokens); 
    }

    //  ----- BUY WITH SIGNATURE TESTS -----

    function test_buyProductOnBehalfOfAPayerWithSignatureWorksCorrectly() external {
    _fillStoreWithProducts();

    address friend = makeAddr("PoorGuy");

    address owner = address(userWithTokens);
    address spender = address(store);
    uint256 value = BIKE_PRICE;
    uint256 nonce = token.nonces(address(userWithTokens));
    uint256 deadline = block.timestamp + 3600;  

    (uint8 v, bytes32 r, bytes32 s) = _signPermit(owner, spender, value, nonce, deadline);
    vm.prank(friend);
    store.buyProductWithSignature(BIKE, owner, value, deadline, r, s, v);
    }

    function test_revertBuyProductWithSignatureForUsedSignature() external {
    _fillStoreWithProducts();
    address friend = makeAddr("PoorGuy");

    address owner = address(userWithTokens);
    address spender = address(store);
    uint256 value = BIKE_PRICE;
    uint256 nonce = token.nonces(address(userWithTokens));
    uint256 deadline = block.timestamp + 3600;  

    (uint8 v, bytes32 r, bytes32 s) = _signPermit(owner, spender, value, nonce, deadline);

    vm.startPrank(friend);
    store.buyProductWithSignature(BIKE, owner, value, deadline, r, s, v);
    vm.expectRevert("ERC20Permit: invalid signature");
    store.buyProductWithSignature(BIKE, owner, value, deadline, r, s, v);
    }


    function test_revertIfSignatureDeadlineHasPassed() external{
    _fillStoreWithProducts();
    address executor = makeAddr("exec");

    address owner = executor;
    address spender = address(store);
    uint256 value = BIKE_PRICE;
    uint256 nonce = token.nonces(address(executor));
    uint256 deadline = block.timestamp + 3600;  

    (uint8 v, bytes32 r, bytes32 s) = _signPermit(owner, spender, value, nonce, deadline);
    vm.warp(block.timestamp + 3601);
    vm.expectRevert("ERC20Permit: expired deadline");
    store.buyProductWithSignature(BALL, owner, value, deadline, r, s, v);
    }
    
}
