import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Store } from "../typechain-types/contracts/TechnoLime.sol";
import { IERC20, LimeTokenERC20, Owner } from "../typechain-types";

describe("Store", function () {
  const bike = "bike";
  const book = "book";
  const ball = "ball";

  let store: Store;
  let limeToken: LimeTokenERC20;
  let secondUserSignature;

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

    await store.createProductOrAddQuantity(bike, 5, 2000);
    await store.createProductOrAddQuantity(ball, 10, 500);
    await store.createProductOrAddQuantity(book, 2, 550);

    return store;
  }

  async function deployLimeTokenAndMintTokensToUser() {
    limeToken = await ethers.deployContract("LimeTokenERC20");
    (await limeToken).waitForDeployment();
    const [owner, user] = await ethers.getSigners();

    (await limeToken).mint(user, 5000);
  }

  // Helper function
  // To use this function - Store and LimeToken should  be implemented.
  async function prepareSignature(
    owner: string,
    spendingAmount: number,
    deadline: number
  ) {
    const domainData = {
      name: "LimeToken",
      version: "1",
      chainId: 31337,
      verifyingContract: await limeToken.getAddress(),
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
    const userNonce = await limeToken.nonces(owner);

    const value = {
      owner: owner,
      spender: await store.getAddress(),
      value: spendingAmount,
      nonce: userNonce,
      deadline: deadline,
    };

    return await (
      await ethers.getSigner(owner)
    ).signTypedData(domainData, types, value);
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

        await store.createProductOrAddQuantity(bike, 5, 2000);
        await expect(store.createProductOrAddQuantity(ball, 10, 500))
          .to.emit(store, "ProductAdded")
          .withArgs(ball, 10);
        await expect(store.createProductOrAddQuantity(bike, 5, 2000))
          .to.emit(store, "ProductQuantityAdded")
          .withArgs(bike, 5);

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
        expect((await store.productProperties(book)).quantity).to.equal(2);

        // Approve store to spend assets on behalf of user.
        await limeToken.connect(user).approve(await store.getAddress(), 550);

        // The exchange of the transfer is returned to the user.
        await store.connect(user).buyProduct(book);
        // -- Afrter transaction

        expect(await store.buyers(0)).to.equal(user.address);
        expect((await store.productProperties(book)).quantity).to.equal(1);
        expect(await limeToken.balanceOf(user)).to.equal(5000 - 550);
        expect(await limeToken.balanceOf(store)).to.equal(550);
      });

      it("Should be possible to return a product in before the required time has passed", async function () {
        const store = await loadFixture(fillStoreWithProducts);
        const [, user] = await ethers.getSigners();

        await limeToken.connect(user).approve(await store.getAddress(), 550);

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

        await limeToken.connect(user).approve(await store.getAddress(), 550);

        expect((await store.getBuyers()).length).to.equal(0);
        await store.connect(user).buyProduct(book);
        expect((await store.getBuyers()).at(0)).to.equal(user.address);
      });

      it("Should be possible buyer to sign transaction off-chain and other account buy a product on his behalf", async function () {
        // Prepare the signature
        await loadFixture(fillStoreWithProducts);
        const [, userWithTokens, userWithoutTokens] = await ethers.getSigners();

        const bookPrice = 550;
        const deadline = Math.floor(Date.now()) + 3600;

        const signature = await prepareSignature(
          userWithTokens.address,
          bookPrice,
          deadline
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
              deadline,
              signature
            )
        ).to.not.be.reverted;

        expect(await store.buyers(0)).to.equal(userWithTokens.address);
        expect((await store.productProperties(book)).quantity).to.equal(1);
        expect(await limeToken.balanceOf(userWithTokens)).to.equal(5000 - 550);
        expect(await limeToken.balanceOf(store)).to.equal(550);
      });
    });
  });

  describe("Reverts", async function () {
    context("Modifiers for the special role functions", async function () {
      it("Should revert when not owner is trying to add a product", async function () {
        await loadFixture(deployEmptyStoreFixture);
        const [, user] = await ethers.getSigners();

        await expect(
          store.connect(user).createProductOrAddQuantity("product", 5, 200)
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

          await limeToken.connect(user).approve(await store.getAddress(), 550);
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
        await limeToken.connect(user).approve(await store.getAddress(), 550);

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

        const bookPrice = 550;
        const deadline = Math.floor(Date.now()) + 3600;

        const signature = await prepareSignature(
          userWithoutTokens.address,
          bookPrice,
          deadline
        );

        await expect(
          store.buyProductWithSignature(
            book,
            userWithTokens.address,
            bookPrice,
            deadline,
            signature
          )
        ).to.revertedWith("ERC20Permit: invalid signature");
      });

      it("Should revert when 'onBehalfOf' is zero address and signiture is invalid.", async function () {
        await loadFixture(fillStoreWithProducts);
        const [, userWithTokens, userWithoutTokens] = await ethers.getSigners();

        const bookPrice = 550;
        const deadline = Math.floor(Date.now()) + 3600;

        const fakeSignature = await userWithTokens.signMessage(
          "Very123good23very2nice4"
        );
        console.log(fakeSignature);
        await expect(
          store.buyProductWithSignature(
            book,
            ethers.ZeroAddress,
            bookPrice,
            deadline,
            fakeSignature
          )
        ).to.revertedWith("ERC20Permit: invalid signature");
      });
    });
  });
});
