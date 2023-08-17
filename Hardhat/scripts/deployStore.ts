import { ethers } from "hardhat";

export async function main() {
  const stringLib = await ethers.deployContract("StringComparator");
  await stringLib.waitForDeployment();

  const store = await ethers.deployContract("Store", {
    libraries: {
      StringComparator: await stringLib.getAddress(),
    },
  });

  await store.waitForDeployment();

  console.log(`Store has been deployed on ${await store.getAddress()}`);
}

main().catch((error) => {
  console.log(error);
  process.exitCode = 1;
});
