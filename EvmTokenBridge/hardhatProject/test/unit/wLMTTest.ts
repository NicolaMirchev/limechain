import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { WLMT } from "../../typechain-types/contracts/WLMT";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("wLMT", function () {
  let wLMTToken: WLMT;
  const domainName = "Wrapped LMT";
  const domainVersion = "1";
  const hardhatChainId = 31337;

  async function deploywLMTFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const wLMTFactory = await ethers.getContractFactory("wLMT");
    const wLMT = await wLMTFactory.deploy();
    wLMTToken = wLMT as WLMT;

    return { wLMT, owner, otherAccount };
  }

  async function prepareSignature(
    domainVerifyingContract: string,
    signer: string,
    claimer: string,
    amount: number
  ) {
    const domainData = {
      name: domainName,
      version: domainVersion,
      chainId: hardhatChainId,
      verifyingContract: domainVerifyingContract,
    };

    const types = {
      Mint: [
        { name: "claimer", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "uint256" },
      ],
    };
    const claimerNonce = await wLMTToken.nonces(claimer);

    const value = {
      claimer: claimer,
      amount: amount,
      nonce: claimerNonce,
    };

    let signature = await (
      await ethers.getSigner(signer)
    ).signTypedData(domainData, types, value);
    console.log("Signature = ", signature);
    console.log("Value = ", value);
    console.log("Domain Data = ", domainData);

    return splitSignature(signature);
  }

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

  describe("Actions", function () {
    it("Should set the right owner", async function () {
      const { wLMT, owner, otherAccount } = await deploywLMTFixture();

      expect(await (wLMT as any).owner()).to.equal(owner.address);
    });
    it("Should be possible to mint tokens to an address using signature from owner.", async function () {
      const { wLMT, owner, otherAccount } = await deploywLMTFixture();
      const valueToBeMinted = 1000;

      const { r, s, v } = await prepareSignature(
        await wLMT.getAddress(),
        await owner.getAddress(),
        await otherAccount.getAddress(),
        valueToBeMinted
      );

      console.log("token address = " + (await wLMTToken.getAddress()));
      console.log("Claimer address " + (await otherAccount.getAddress()));
      console.log("Owner address " + (await wLMTToken.owner()));

      expect(
        await wLMTToken
          .connect(otherAccount)
          .mintWithSignature(
            await otherAccount.getAddress(),
            valueToBeMinted,
            v,
            r,
            s
          )
      )
        .to.emit(wLMTToken, "TokenClaimed")
        .withArgs(otherAccount.address, 1000);
    });
  });

  describe("Reverts", function () {});
});
