import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { libraries } from "../typechain-types";

describe("Store", function () {
  async function deployEmptyStoreFixture() {
    const comparatorLib = await ethers.deployContract("StringComparator");
    await comparatorLib.waitForDeployment();

    const store = ethers.deployContract("Store", {
      libraries: { StringComparator: await comparatorLib.getAddress() },
    });

    return store;
  }

  it("Should be deployed successfully and the owner is the deployer", async function () {
    const store = await loadFixture(deployEmptyStoreFixture);

    expect(await store.owner()).equals(
      (await ethers.provider.getSigner()).address
    );
  });
});
