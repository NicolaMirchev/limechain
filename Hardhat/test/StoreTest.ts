import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { libraries } from "../typechain-types";

describe("Store", function () {
  const bike = "bike";
  const book = "book";
  const ball = "ball";

  async function deployEmptyStoreFixture() {
    const comparatorLib = await ethers.deployContract("StringComparator");
    await comparatorLib.waitForDeployment();

    const store = ethers.deployContract("Store", {
      libraries: { StringComparator: await comparatorLib.getAddress() },
    });

    return store;
  }

  async function fillStoreWithProducts() {
    const store = await loadFixture(deployEmptyStoreFixture);
    await store.createProductOrAddQuantity(bike, 5, 2000);
    await store.createProductOrAddQuantity(ball, 10, 500);
    await store.createProductOrAddQuantity(book, 2, 550);

    return store;
  }

  describe("Actions", async function () {
    it("Should be deployed successfully and the owner is the deployer", async function () {
      const store = await loadFixture(deployEmptyStoreFixture);

      expect(await store.owner()).equals(
        (await ethers.provider.getSigner()).address
      );
    });

    it("Should be possible owner to add products. When product", async function () {
      const store = await loadFixture(deployEmptyStoreFixture);

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

    it("Should be possible to buy product. State variables are changed, money are being tranfered", async function () {
      const store = await loadFixture(fillStoreWithProducts);
      const [, user] = await ethers.getSigners();

      // -- Before transaction
      expect((await store.productProperties(book)).quantity).to.equal(2);

      // The exchange of the transfer is returned to the user.
      await expect(
        store.connect(user).buyProduct(book, { value: 5000 })
      ).to.changeEtherBalances([store, user], [550, -550]);
      // -- Afrter transaction

      expect(await store.buyers(0)).to.equal(user.address);
      expect((await store.productProperties(book)).quantity).to.equal(1);
    });

    it("Should be possible to return a product in before the required time has passed", async function () {
      const store = await loadFixture(fillStoreWithProducts);
      const [, user] = await ethers.getSigners();

      await store.connect(user).buyProduct(book, { value: 5000 });
      expect((await store.productProperties(book)).quantity).to.equal(1);

      await expect(
        store.connect(user).returnProduct(book)
      ).to.changeEtherBalances([user, store], [550, -550]);

      expect((await store.productProperties(book)).quantity).to.equal(2);
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

      expect((await store.getBuyers()).length).to.equal(0);
      await store.connect(user).buyProduct(book, { value: 5000 });
      expect((await store.getBuyers()).at(0)).to.equal(user.address);
    });

    it("Should be possible to change the owner of the store", async function () {
      const store = await loadFixture(deployEmptyStoreFixture);
      const [firstOwner, secondOwner] = await ethers.getSigners();

      expect(await store.owner()).to.equal(firstOwner.address);
      await store.changeOwner(secondOwner);
      expect(await store.owner()).to.equal(secondOwner.address);
    });
  });

  describe("Reverts", async function () {
    it("Should revert when not owner is trying to add a product", async function () {
      const store = await loadFixture(deployEmptyStoreFixture);
      const [, user] = await ethers.getSigners();

      await expect(
        store.connect(user).createProductOrAddQuantity("product", 5, 200)
      ).to.be.revertedWith("Unauthorized");
    });

    it("Should revert when user is trying to buy product, which does not exists", async function () {
      const store = await loadFixture(deployEmptyStoreFixture);
      const [, user] = await ethers.getSigners();

      await expect(
        store.connect(user).buyProduct("NonExistent")
      ).to.be.revertedWithCustomError(store, "ProductNotFound");
    });

    it("Should revert when user is trying to buy product with no enought money", async function () {
      const store = await loadFixture(fillStoreWithProducts);
      const [, user] = await ethers.getSigners();

      await expect(store.connect(user).buyProduct(bike)).to.be.revertedWith(
        "Not enough money"
      );
    });

    it("Should revert when user is trying to buy the same product twice", async function () {
      const store = await loadFixture(fillStoreWithProducts);
      const [, user] = await ethers.getSigners();

      await store.connect(user).buyProduct(book, { value: 5000 });
      await expect(
        store.connect(user).buyProduct(book, { value: 5000 })
      ).to.be.revertedWith("Cannot buy tha same product twise");
    });

    it("Should revert when user is trying to return already returned product", async function () {
      const store = await loadFixture(fillStoreWithProducts);
      const [, user] = await ethers.getSigners();

      await store.connect(user).buyProduct(book, { value: 5000 });
      await store.connect(user).returnProduct(book);

      await expect(store.connect(user).returnProduct(book)).to.be.revertedWith(
        "Client has already returned the given stock"
      );
    });

    it("Should revert when user is trying to return product, when the return policy is overdue.", async function () {
      const store = await loadFixture(fillStoreWithProducts);
      const [, user] = await ethers.getSigners();

      await store.connect(user).buyProduct(book, { value: 5000 });

      // Simulate passage of 100 blocks.
      for (let i = 0; i < 100; i++) {
        await time.increase(12);
      }

      await expect(store.connect(user).returnProduct(book)).to.be.revertedWith(
        "More than 100 blocks has passed from the purchase"
      );
    });
  });
});
