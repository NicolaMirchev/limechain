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

    it("Should be possible owner to add products.", async function () {
      const store = await loadFixture(deployEmptyStoreFixture);

      // -- Before adding
      expect((await store.seeProductsInShop()).length).to.equal(0);

      await store.createProductOrAddQuantity(bike, 5, 2000);
      await store.createProductOrAddQuantity(ball, 10, 500);
      await store.createProductOrAddQuantity(bike, 5, 2000);

      // -- After adding. Expect the last addition to only have increased the qunatity and so, the products are still 2.
      expect((await store.seeProductsInShop()).length).to.equal(2);
    });

    it("Should be possible to buy product. State variables are changed, money are being tranfered", async function () {
      const store = await loadFixture(fillStoreWithProducts);
      const [, user] = await ethers.getSigners();

      // -- Before transaction
      expect(await store.productAvailability(book)).to.equal(2);

      // The exchange of the transfer is returned to the user.
      await expect(
        store.connect(user).buyProduct(book, { value: 5000 })
      ).to.changeEtherBalances([store, user], [550, -550]);
      // -- Afrter transaction

      console.log(await store.buyers(0));
      expect(await store.buyers(0)).to.equal(user.address);
      expect(await store.productAvailability(book)).to.equal(1);
    });
  });

  describe("Reverts", async function () {
    it("Should revert when not owner is trying to add a product", async function () {
      const store = await loadFixture(deployEmptyStoreFixture);
      const [owner, user] = await ethers.getSigners();

      await expect(
        store.connect(user).createProductOrAddQuantity("product", 5, 200)
      ).to.be.revertedWith("Unauthorized");
    });
  });

  describe("Events", async function () {});
});
