import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Store } from "../typechain-types/contracts/TechnoLime.sol";
import { LimeTokenERC20, IERC20Permit } from "../typechain-types";

/*
 Constant variables to be used when testing different scenarios.
*/

const bike = "bike";
const bikeQuantity = 5;
const bikePrice = 2000;
const ball = "ball";
const ballQuantity = 10;
const ballPrice = 500;
const book = "book";
const bookQuantity = 2;
const bookPrice = 550;

const deadline = Math.floor(Date.now()) + 3600;
const domainNmae = "LimeTokenERC20";
const domainVersion = "1";
const hardhatChainId = 31337;

/**
 *  Tests regarding TechnoLime store
 */
describe("Store", function () {
  let store: Store;
  let limeToken: LimeTokenERC20;

  async function deployEmptyStoreFixture() {
    const comparatorLib = await ethers.deployContract("StringComparator");
    await comparatorLib.waitForDeployment();
    await loadFixture(deployLimeTokenAndMintTokensToUser);

    store = await ethers.deployContract(
      "Store",
      [(await limeToken).getAddress()],
      {
        libraries: { StringComparator: await comparatorLib.getAddress() },
      }
    );
  }

  async function fillStoreWithProducts() {
    await loadFixture(deployEmptyStoreFixture);

    await store.createProductOrAddQuantity(bike, bikeQuantity, bikePrice);
    await store.createProductOrAddQuantity(ball, ballQuantity, ballPrice);
    await store.createProductOrAddQuantity(book, bookQuantity, bookPrice);

    return store;
  }

  async function deployLimeTokenAndMintTokensToUser() {
    limeToken = await ethers.deployContract("LimeTokenERC20");
    (await limeToken).waitForDeployment();
    const [owner, user] = await ethers.getSigners();

    (await limeToken).mint(user, 5000);
  }

  /* 
   Helper function
   To use this function - Store and LimeToken should  be implemented.
  */
  async function prepareSignature(
    domainName: string,
    domainVersion: string,
    domainChainId: number,
    domainVerifyingContract: string,
    owner: string,
    spender: string,
    spendingAmount: number,
    deadline: number,
    token: IERC20Permit
  ) {
    const domainData = {
      name: domainName,
      version: domainVersion,
      chainId: domainChainId,
      verifyingContract: domainVerifyingContract,
    };

    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };
    const userNonce = await token.nonces(owner);

    const value = {
      owner: owner,
      spender: spender,
      value: spendingAmount,
      nonce: userNonce,
      deadline: deadline,
    };

    let sig = await (
      await ethers.getSigner(owner)
    ).signTypedData(domainData, types, value);

    console.log("SigPreSplit " + sig);

    return splitSignature(sig);
  }

  describe("Actions", async function () {
    it("Should be deployed successfully and the owner is the deployer", async function () {
      await loadFixture(deployEmptyStoreFixture);

      expect(await store.owner()).equals(
        (await ethers.provider.getSigner()).address
      );
    });

    context("Manager interactions with the store contract", async function () {
      it("Should be possible owner to add products. When product exists, only it's quantity is changed", async function () {
        await loadFixture(deployEmptyStoreFixture);

        // -- Before adding
        expect((await store.seeProductsInShop()).length).to.equal(0);

        await store.createProductOrAddQuantity(bike, bikeQuantity, bikePrice);
        await expect(
          store.createProductOrAddQuantity(ball, ballQuantity, ballPrice)
        )
          .to.emit(store, "ProductAdded")
          .withArgs(ball, 10);
        await expect(
          store.createProductOrAddQuantity(bike, bikeQuantity, bikePrice)
        )
          .to.emit(store, "ProductQuantityAdded")
          .withArgs(bike, bikeQuantity);

        // -- After adding. Expect the last addition to only have increased the qunatity and so, the products are still 2.
        expect((await store.seeProductsInShop()).length).to.equal(2);
      });

      it("Should be possible to change the owner of the store", async function () {
        await loadFixture(deployEmptyStoreFixture);
        const [firstOwner, secondOwner] = await ethers.getSigners();

        expect(await store.owner()).to.equal(firstOwner.address);
        await store.changeOwner(secondOwner);
        expect(await store.owner()).to.equal(secondOwner.address);
      });
    });

    context("Client interactions with the store contract", async function () {
      it("Should be possible to buy product. State variables are changed, money are being tranfered", async function () {
        await loadFixture(fillStoreWithProducts);
        const [, user] = await ethers.getSigners();

        // -- Before transaction
        expect((await store.productProperties(book)).quantity).to.equal(
          bookQuantity
        );

        // Approve store to spend assets on behalf of user.
        await limeToken
          .connect(user)
          .approve(await store.getAddress(), bookPrice);

        // The exchange of the transfer is returned to the user.
        await store.connect(user).buyProduct(book);
        // -- Afrter transaction

        expect(await store.buyers(0)).to.equal(user.address);
        expect((await store.productProperties(book)).quantity).to.equal(
          bookQuantity - 1
        );
        expect(await limeToken.balanceOf(user)).to.equal(5000 - bookPrice);
        expect(await limeToken.balanceOf(store)).to.equal(bookPrice);
      });

      it("Should be possible to return a product in before the required time has passed", async function () {
        const store = await loadFixture(fillStoreWithProducts);
        const [, user] = await ethers.getSigners();

        await limeToken
          .connect(user)
          .approve(await store.getAddress(), bookPrice);

        await store.connect(user).buyProduct(book);
        expect((await store.productProperties(book)).quantity).to.equal(1);

        await store.connect(user).returnProduct(book);

        expect((await store.productProperties(book)).quantity).to.equal(2);
        // Because returned value is only 80%
        expect(await limeToken.balanceOf(store)).to.equal(110);
      });

      it("Should return correct value for get products count", async function () {
        const store = await loadFixture(fillStoreWithProducts);

        expect(await store.getProductsCount()).to.equal(3);
      });

      it("Should return correct product collection when they are requested.", async function () {
        const store = await loadFixture(fillStoreWithProducts);
        const products = await store.seeProductsInShop();

        expect(products.length).to.equal(3);
        expect(products.find((p) => p.id == book)).is.not.undefined;
        expect(products.find((p) => p.id == bike)).is.not.undefined;
        expect(products.find((p) => p.id == ball)).is.not.undefined;
      });

      it("Should return correct buyers collection", async function () {
        const store = await loadFixture(fillStoreWithProducts);
        const [, user] = await ethers.getSigners();

        await limeToken
          .connect(user)
          .approve(await store.getAddress(), bookPrice);

        expect((await store.getBuyers()).length).to.equal(0);
        await store.connect(user).buyProduct(book);
        expect((await store.getBuyers()).at(0)).to.equal(user.address);
      });

      it("Should be possible buyer to sign transaction off-chain and other account buy a product on his behalf", async function () {
        // Prepare the signature
        await loadFixture(fillStoreWithProducts);
        const [, userWithTokens, userWithoutTokens] = await ethers.getSigners();

        const domainVerifyingContract = await limeToken.getAddress();
        const deadlineHere = Math.floor(Date.now()) + 3600;

        const { r, s, v } = await prepareSignature(
          domainNmae,
          domainVersion,
          hardhatChainId,
          domainVerifyingContract,
          userWithTokens.address,
          await store.getAddress(),
          bookPrice,
          deadlineHere,
          limeToken
        );

        // -- Before transaction
        expect((await store.productProperties(book)).quantity).to.equal(2);

        await expect(
          store
            .connect(userWithoutTokens)
            .buyProductWithSignature(
              book,
              userWithTokens.address,
              bookPrice,
              deadlineHere,
              r,
              s,
              v
            )
        ).to.not.be.reverted;

        expect(await store.buyers(0)).to.equal(userWithTokens.address);
        expect((await store.productProperties(book)).quantity).to.equal(1);
        expect(await limeToken.balanceOf(userWithTokens)).to.equal(
          5000 - bookPrice
        );
        expect(await limeToken.balanceOf(store)).to.equal(bookPrice);
      });
    });
  });

  describe("Reverts", async function () {
    context("Modifiers for the special role functions", async function () {
      it("Should revert when not owner is trying to add a product", async function () {
        await loadFixture(deployEmptyStoreFixture);
        const [, user] = await ethers.getSigners();

        await expect(
          store
            .connect(user)
            .createProductOrAddQuantity("product", bookQuantity, bookPrice)
        ).to.be.revertedWith("Unauthorized");
      });
    });

    context(
      "Invalid actions regarding the business requirements",
      async function () {
        it("Should revert when user is trying to buy the same product twice", async function () {
          await loadFixture(fillStoreWithProducts);
          const [, user] = await ethers.getSigners();

          await limeToken.connect(user).approve(await store.getAddress(), 1100);

          await store.connect(user).buyProduct(book);
          await expect(store.connect(user).buyProduct(book)).to.be.revertedWith(
            "Cannot buy the same product twise"
          );
        });

        it("Should revert when user is trying to return product, when the return policy is overdue.", async function () {
          await loadFixture(fillStoreWithProducts);
          const [, user] = await ethers.getSigners();

          await limeToken
            .connect(user)
            .approve(await store.getAddress(), bookPrice);
          await store.connect(user).buyProduct(book);

          // Simulate passage of 100 blocks.
          for (let i = 0; i < 100; i++) {
            await time.increase(12);
          }

          await expect(
            store.connect(user).returnProduct(book)
          ).to.be.revertedWith(
            "More than 100 blocks has passed from the purchase"
          );
        });
      }
    );

    context("Natural logic condition", async function () {
      it("Should revert when user is trying to buy product, which does not exists", async function () {
        await loadFixture(deployEmptyStoreFixture);
        const [, user] = await ethers.getSigners();

        await expect(
          store.connect(user).buyProduct("NonExistent")
        ).to.be.revertedWithCustomError(store, "ProductNotFound");
      });

      it("Should revert when user is trying to buy product with no enought money", async function () {
        await loadFixture(fillStoreWithProducts);
        const [, user] = await ethers.getSigners();

        await expect(store.connect(user).buyProduct(bike)).to.be.revertedWith(
          "Not enough money"
        );
      });

      it("Should revert when user is trying to return already returned product", async function () {
        await loadFixture(fillStoreWithProducts);
        const [, user] = await ethers.getSigners();
        await limeToken
          .connect(user)
          .approve(await store.getAddress(), bookPrice);

        await store.connect(user).buyProduct(book);
        await store.connect(user).returnProduct(book);

        await expect(
          store.connect(user).returnProduct(book)
        ).to.be.revertedWith("Client has already returned the given stock");
      });
    });

    context("Signiture missmatch for the meta-transactions", async function () {
      it("Should revert when signer of the transaction is different from the account provied for the 'onBehalf' function", async function () {
        await loadFixture(fillStoreWithProducts);
        const [, userWithTokens, userWithoutTokens] = await ethers.getSigners();

        const domatinVerifyingContract = await limeToken.getAddress();

        const { r, s, v } = await prepareSignature(
          domainNmae,
          domainVersion,
          hardhatChainId,
          domatinVerifyingContract,
          userWithoutTokens.address,
          await store.getAddress(),
          bookPrice,
          deadline,
          limeToken
        );

        await expect(
          store.buyProductWithSignature(
            book,
            userWithTokens.address,
            bookPrice,
            deadline,
            r,
            s,
            v
          )
        ).to.revertedWith("ERC20Permit: invalid signature");
      });

      it("Should revert when 'spender' is zero address and signiture is invalid.", async function () {
        await loadFixture(fillStoreWithProducts);
        const [, userWithTokens] = await ethers.getSigners();

        const fakeSignature = await userWithTokens.signMessage(
          "Very123good23very2nice4"
        );
        const { r, s, v } = splitSignature(fakeSignature);

        await expect(
          store.buyProductWithSignature(
            book,
            ethers.ZeroAddress,
            bookPrice,
            deadline,
            r,
            s,
            v
          )
        ).to.revertedWith("ERC20Permit: invalid signature");
      });
    });
  });
});

/**
 * Utility func to be used to split signed transaction off-chain
 * @param sig signature to be splitted to v,r and s
 * @returns the passed param splitted to match the standard for v,r,s signature
 */
function splitSignature(sig: string): { r: string; s: string; v: string } {
  const r = sig.slice(0, 66); // 32 bytes (64 characters) for r
  const s = "0x" + sig.slice(66, 130); // 32 bytes (64 characters) for s
  const v = "0x" + sig.slice(130, 132); // 1 byte (2 characters) for v

  return { r, s, v };
}
