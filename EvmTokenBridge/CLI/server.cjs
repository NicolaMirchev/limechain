// server.cjs

require("dotenv").config();
const Contract = require("@truffle/contract");
const WalletProvider = require("@truffle/hdwallet-provider");
const { Web3 } = require("web3");
const ethers = require("ethers");
var express = require("express");
const fs = require("fs");
const app = express();
const db = require("./dbConfig.cjs");
const { number } = require("yargs");

// ------ Environment config ------

const PROVIDER_KEY = process.env.PROVIDER_KEY;
const SEPOLIA_RPC_WEB_SOCKET = process.env.SEPOLIA_WEB_SOCKET;
const MUMBAI_RPC_WEB_SOCKET = process.env.MUMBAI_WEB_SOCKET;
const SOURCE_TOKEN_ADDRESS = process.env.CONTRACT_ADDRESS;
const BRIDGE_ADDRESS = process.env.BRIDGE_ADDRESS;
const DESTINATION_TOKEN_ADDRESS = process.env.DESTINATION_TOKEN_ADDRESS;
const port = process.env.PORT || 3000;

const destinationDomainName = "Wrapped LMT";
const destinationDomainVersion = "1";
const mumbaiChainId = 80001;

const sourceDomainName = "LMTBridge";
const sourceDomainVersion = "1";
const sepoliaChainId = 11155111;

// ------ Web3 config ------
const abiPath = "../hardhatProject/artifacts/contracts";
const rawDataBridgeContract = fs.readFileSync(
  abiPath + "/LMTBridge.sol/LMTBridge.json"
);
const bridgeAbi = JSON.parse(rawDataBridgeContract).abi;
const sourceProvider = new ethers.WebSocketProvider(SEPOLIA_RPC_WEB_SOCKET);
const bridgeContract = new ethers.Contract(
  BRIDGE_ADDRESS,
  bridgeAbi,
  sourceProvider
);

const sourceSigner = new ethers.Wallet(PROVIDER_KEY, sourceProvider);

// Destination chain
const rawDatawLMTContract = fs.readFileSync(
  abiPath + "/wERC20.sol/wERC20.json"
);
const wERC20Abi = JSON.parse(rawDatawLMTContract).abi;
const destinationProvider = new ethers.WebSocketProvider(MUMBAI_RPC_WEB_SOCKET);
const wLMTContract = new ethers.Contract(
  DESTINATION_TOKEN_ADDRESS,
  wERC20Abi,
  destinationProvider
);
const destinationSigner = new ethers.Wallet(PROVIDER_KEY, destinationProvider);
const contracts = [];
// ------ Event listeners ------
// Source chain
bridgeContract.on("TokenLocked", async (token, user, amount, event) => {
  // Here we should sign a transaction to mint tokens on the destination chain from the provider and return the signature.

  // If the token address is new, we should create new contract.
  if (!contracts.some((contract) => contract.token === token)) {
    const wERC20 = new ethers.Contract(token, wERC20Abi, destinationProvider);
    contracts.push({ token: token, contract: wERC20 });

    wERC20.on("TokenClaimed", async (claimer, amount, event) => {
      try {
        await db
          .ref("users")
          .child(user)
          .child("bridgedAmount")
          .transaction((currentValue) => {
            currentValue + Number(amount);
          });

        await db
          .ref("users")
          .child(user)
          .child("actionSignature")
          .child("used")
          .set(true);
      } catch (error) {
        console.log("Errror trying to input event data into db: " + error);
      }
      console.log("Claimed event: ", claimer, amount);
    });
    wERC20.on("TokenBurned", async (user, amount, event) => {
      const { r, s, v } = await prepareSignature(
        sourceDomainName,
        sourceDomainVersion,
        sepoliaChainId,
        token,
        // sourceTokenAddress,
        sourceSigner,
        user,
        amount,
        await bridgeContract.nonces(user)
      );
      try {
        // Here we should write to db the event data.
      } catch (error) {
        console.log("Errror trying to input event data into db: " + error);
      }
    });
  }
  wERC20 = contracts.find((contract) => contract.token === token).contract;

  const { r, s, v } = await prepareSignature(
    await wERC20.name(),
    destinationDomainVersion,
    mumbaiChainId,
    token,
    destinationSigner,
    user,
    amount,
    await wLMTContract.nonces(user)
  );
  try {
    const locked = await db
      .ref("users")
      .child(user)
      .child("lockedAmount")
      .get();

    if (locked.exists()) {
      db.ref("users")
        .child(user)
        .child("lockedAmount")
        .set(locked.val() + Number(amount));
    } else {
      db.ref("users").child(user).child("lockedAmount").set(Number(amount));
      db.ref("users").child(user).child("bridgedAmount").set(0);
      db.ref("users").child(user).child("amountToBeReleased").set(0);
    }

    db.ref("users")
      .child(user)
      .child("actionSignature")
      .child("used")
      .set(false);
    db.ref("users").child(user).child("actionSignature").child("v").set(v);
    db.ref("users").child(user).child("actionSignature").child("r").set(r);
    db.ref("users").child(user).child("actionSignature").child("s").set(s);

    // Write data to db.
    // Store signature to db.
  } catch (error) {
    console.log("Errror trying to input event data into db: " + error);
  }
  console.log("R, s, v ", r, s, v);
});
// ------ Event listeners ------
bridgeContract.on("TokenReleased", async (token, user, amount, event) => {
  // Here we should sign a transaction to unlock tokens on the source chain .

  try {
    // Write data to db.
  } catch (error) {
    console.log("Errror trying to input event data into db: " + error);
  }
  console.log("Locked event: ", user, amount);
});

// ------ API endpoints ------
app.get("/", (req, res) => {
  res.send("Running!");
  db.ref("users")
    .child("0xUserAddress")
    .child("REalTokenAddress")
    .set({ amountToBeReleased: 2, bridgedAmount: 0, lockedAmount: 4 });
});

app.listen(port, () => {
  console.log("App is running on port: ", port);
});

/**
 * Utility func to be used to split signed transaction off-chain
 * @param sig signature to be splitted to v,r and s
 * @returns the passed param splitted to match the standard for v,r,s signature
 */
function splitSignature(sig) {
  const r = sig.slice(0, 66); // 32 bytes (64 characters) for r
  const s = "0x" + sig.slice(66, 130); // 32 bytes (64 characters) for s
  const v = "0x" + sig.slice(130, 132); // 1 byte (2 characters) for v

  return { r, s, v };
}
/**
 * Utility func to be used to prepare the signature off-chain. Struct is defined to match the typed data, which we use for the bridge functionallity
 * to validate ownership of the tokens and amount.
 * @param domainName name of the domain
 * @param domainVersion version of the domain
 * @param chainId chainId of the domain
 * @param domainVerifyingContract address of the domain
 * @param signer address of the signer
 * @param claimer address of the claimer
 * @param amount amount of tokens to be locked
 * @param nonce nonce of the claimer
 * @returns the splitted signature
 * */
async function prepareSignature(
  domainName,
  domainVersion,
  chainId,
  domainVerifyingContract,
  signer,
  claimer,
  amount,
  nonce
) {
  const domainData = {
    name: domainName,
    version: domainVersion,
    chainId: chainId,
    verifyingContract: domainVerifyingContract,
  };

  const types = {
    Claim: [
      { name: "claimer", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  };

  const value = {
    claimer: claimer,
    amount: amount,
    nonce: nonce,
  };
  console.log("Domain data: ", domainData);
  console.log("Signer: ", signer);
  console.log("Value: ", value);
  let signature = await signer.signTypedData(domainData, types, value);
  console.log("Signature: ", signature);
  return splitSignature(signature);
}
