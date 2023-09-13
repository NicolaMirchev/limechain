// server.cjs
let database = require("./database.cjs");

require("dotenv").config();
const Contract = require("@truffle/contract");
const WalletProvider = require("@truffle/hdwallet-provider");
const { Web3 } = require("web3");
const ethers = require("ethers");
var express = require("express");
const fs = require("fs");
const app = express();

// ------ Environment config ------
const SEPOLIA_RPC_WEB_SOCKET = process.env.SEPOLIA_WEB_SOCKET;
const MUMBAI_RPC_WEB_SOCKET = process.env.MUMBAI_WEB_SOCKET;
const SOURCE_TOKEN_ADDRESS = process.env.CONTRACT_ADDRESS;
const BRIDGE_ADDRESS = process.env.BRIDGE_ADDRESS;
const DESTINATION_TOKEN_ADDRESS = process.env.DESTINATION_TOKEN_ADDRESS;
const port = process.env.PORT || 3000;

// ------ Web3 config ------
const abiPath = "../hardhatProject/artifacts/contracts";
const rawDataBridgeContract = fs.readFileSync(
  abiPath + "/LMTBridge.sol/LMTBridge.json"
);
const bridgeAbi = JSON.parse(rawDataBridgeContract).abi;
const sepoliaProvider = new ethers.WebSocketProvider(SEPOLIA_RPC_WEB_SOCKET);
const bridgeContract = new ethers.Contract(
  BRIDGE_ADDRESS,
  bridgeAbi,
  sepoliaProvider
);

// ------ Event listeners ------
// Source chain
bridgeContract.on("TokenLocked", (user, amount, event) => {
  // Here we should sign a transaction to mint tokens on the destination chain from the provider and return the signature.
  const eventDataObject = {
    user: user,
    amount: amount,
  };
  try {
    database["Locked"].push(eventDataObject);
  } catch (error) {
    console.log("Errror trying to input event data into db: " + error);
  }
  console.log("Locked event: ", user, amount);
});
// ------ Event listeners ------
bridgeContract.on("TokenReleased", (user, amount, event) => {
  // Here we should sign a transaction to unlock tokens on the source chain .
  const eventDataObject = {
    user: user,
    amount: amount,
  };
  try {
    database["Locked"].push(eventDataObject);
  } catch (error) {
    console.log("Errror trying to input event data into db: " + error);
  }
  console.log("Locked event: ", user, amount);
});

// Destination chain
const rawDatawLMTContract = fs.readFileSync(abiPath + "/wLMT.sol/wLMT.json");
const wLMTAbi = JSON.parse(rawDatawLMTContract).abi;
const mumbaiProvider = new ethers.WebSocketProvider(MUMBAI_RPC_WEB_SOCKET);
const wLMTContract = new ethers.Contract(
  DESTINATION_TOKEN_ADDRESS,
  wLMTAbi,
  mumbaiProvider
);
wLMTContract.on("TokenClaimed", (user, amount, event) => {
  const eventDataObject = {
    user: user,
    amount: amount,
  };
  try {
    database["Claimed"].push(eventDataObject);
  } catch (error) {
    console.log("Errror trying to input event data into db: " + error);
  }
  console.log("Claimed event: ", user, amount);
});
wLMTContract.on("TokenBurned", (user, amount, event) => {
  const eventDataObject = {
    user: user,
    amount: amount,
  };
  try {
    database["Burned"].push(eventDataObject);
  } catch (error) {
    console.log("Errror trying to input event data into db: " + error);
  }
  console.log("Burned event: ", user, amount);
});

// ------ API endpoints ------
app.get("/", (req, res) => {
  res.send("Running!");
});

app.listen(port, () => {
  console.log("App is running on port: ", port);
});
