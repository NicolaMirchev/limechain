import { LMT, LMTBridge } from "../../typechain-types/contracts";
import { expect } from "chai";
import { ethers } from "hardhat";
import { prepareSignature } from "./Util";

describe("LMTBridge", function () {
  let LMTToken: LMT;
  let LMTBridge: LMTBridge;
  const amountOfTokensToLock = 100;
  const domainName = "LMTBridge";
  const domainVersion = "1";
  const hardhatChainId = 31337;

  async function lockTokensFixture() {
    const { LMT, LMTBridge, owner, otherAccount } =
      await deployContractsFixture();
    await LMT.mint(otherAccount.address, amountOfTokensToLock);
    await LMT.connect(otherAccount).approve(
      LMTBridge.getAddress(),
      amountOfTokensToLock
    );

    await LMTBridge.connect(otherAccount).lockTokens(amountOfTokensToLock);

    return { LMT, LMTBridge, owner, otherAccount };
  }

  async function deployContractsFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    const LMTFactory = await ethers.getContractFactory("LMT");
    const LMT = await LMTFactory.deploy();
    LMTToken = LMT as LMT;

    const LMTBridgeFactory = await ethers.getContractFactory("LMTBridge");
    const Bridge = await LMTBridgeFactory.deploy(await LMTToken.getAddress());
    LMTBridge = Bridge as LMTBridge;

    return { LMT, LMTBridge, owner, otherAccount };
  }

  describe("Actions", function () {
    context("Deployment", function () {
      it("Should be deployed with correct owner and LMT address", async function () {
        const { LMT, LMTBridge, owner } = await deployContractsFixture();
        expect(await LMTBridge.owner()).to.equal(owner.address);
        expect(await LMTBridge.lmtToken()).to.equal(await LMT.getAddress());
      });
    });

    context("User locking funds", function () {
      it("Should lock tokens for the correct user", async function () {
        const { LMT, LMTBridge, otherAccount } = await deployContractsFixture();
        await LMT.mint(otherAccount.address, amountOfTokensToLock);
        await LMT.connect(otherAccount).approve(
          LMTBridge.getAddress(),
          amountOfTokensToLock
        );
        expect(
          await LMTBridge.connect(otherAccount).lockTokens(amountOfTokensToLock)
        )
          .to.emit(LMTBridge, "TokensLocked")
          .withArgs(otherAccount.address, amountOfTokensToLock);
        expect(await LMT.balanceOf(await LMTBridge.getAddress())).to.equal(
          amountOfTokensToLock
        );
        expect(await LMTBridge.lockedBalances(otherAccount.address)).to.equal(
          amountOfTokensToLock
        );
      });
    });

    context("User unlocking funds", function () {
      it("Should unlock tokens for the correct user", async function () {
        const { LMT, LMTBridge, owner, otherAccount } =
          await lockTokensFixture();

        const { v, r, s } = await prepareSignature(
          domainName,
          domainVersion,
          hardhatChainId,
          await LMTBridge.getAddress(),
          await LMTBridge.owner(),
          otherAccount.address,
          amountOfTokensToLock,
          await LMTBridge.nonces(otherAccount.address)
        );

        expect(
          await LMTBridge.connect(otherAccount).unlockTokensWithSignature(
            amountOfTokensToLock,
            otherAccount,
            v,
            r,
            s
          )
        )
          .to.emit(LMTBridge, "TokensUnlocked")
          .withArgs(otherAccount.address, amountOfTokensToLock);
      });
    });
  });

  describe("Reverts", function () {
    context("User locking funds", function () {
      it("Should revert if user tries to lock more than they have", async function () {
        const { LMT, LMTBridge, otherAccount } = await deployContractsFixture();
        await LMT.mint(otherAccount.address, amountOfTokensToLock);
        await LMT.connect(otherAccount).approve(
          LMTBridge.getAddress(),
          amountOfTokensToLock + 1
        );
        await expect(
          LMTBridge.connect(otherAccount).lockTokens(amountOfTokensToLock + 1)
        ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
      });
      it("Should revert if user tries to lock 0", async function () {
        const { LMT, LMTBridge, otherAccount } = await deployContractsFixture();
        await LMT.mint(otherAccount.address, amountOfTokensToLock);
        await LMT.connect(otherAccount).approve(
          LMTBridge.getAddress(),
          amountOfTokensToLock
        );
        await expect(
          LMTBridge.connect(otherAccount).lockTokens(0)
        ).to.be.revertedWith("LMTBridge: Amount must be greater than 0");
      });
    });
    context("Unlocking funds", function () {
      it("Should revert if owner tries to unlock 0", async function () {
        const { LMT, LMTBridge, otherAccount } = await deployContractsFixture();
        await LMT.mint(otherAccount.address, amountOfTokensToLock);
        await LMT.connect(otherAccount).approve(
          LMTBridge.getAddress(),
          amountOfTokensToLock
        );
        const { v, r, s } = await prepareSignature(
          domainName,
          domainVersion,
          hardhatChainId,
          await LMTBridge.getAddress(),
          await LMTBridge.owner(),
          otherAccount.address,
          amountOfTokensToLock,
          await LMTBridge.nonces(otherAccount.address)
        );
        await LMTBridge.connect(otherAccount).lockTokens(amountOfTokensToLock);
        await expect(
          LMTBridge.unlockTokensWithSignature(0, otherAccount.address, v, r, s)
        ).to.be.revertedWith("LMTBridge: Amount must be greater than 0");
      });
      it("Should revert if wrong signer has signed the signature", async function () {
        const { LMT, LMTBridge, otherAccount } = await lockTokensFixture();

        const { v, r, s } = await prepareSignature(
          domainName,
          domainVersion,
          hardhatChainId,
          await LMTBridge.getAddress(),
          otherAccount.address,
          otherAccount.address,
          amountOfTokensToLock,
          await LMTBridge.nonces(otherAccount.address)
        );

        await expect(
          LMTBridge.connect(otherAccount).unlockTokensWithSignature(
            amountOfTokensToLock,
            otherAccount.address,
            v,
            r,
            s
          )
        ).to.be.revertedWith("LMTBridge: Invalid signature");
      });
      it("Should revert if owner tries to unlock more than a user they has", async function () {
        const { LMT, LMTBridge, otherAccount } = await lockTokensFixture();

        const { v, r, s } = await prepareSignature(
          domainName,
          domainVersion,
          hardhatChainId,
          await LMTBridge.getAddress(),
          otherAccount.address,
          otherAccount.address,
          amountOfTokensToLock + 1,
          await LMTBridge.nonces(otherAccount.address)
        );

        await expect(
          LMTBridge.unlockTokensWithSignature(
            amountOfTokensToLock + 1,
            otherAccount.address,
            v,
            r,
            s
          )
        ).to.be.revertedWith(
          "LMTBridge: Amount must be less than or equal locked balance"
        );
      });
    });
  });
});
