// server.cjs
import("./database.js").then((module) => {
  const database = module.database;
  // Use database here
});

const Contract = require("@truffle/contract");
const WalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require("web3");
const ethers = require("ethers");
const express = require("express");
const app = express();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL;
const SOURCE_TOKEN_ADDRESS = process.env.CONTRACT_ADDRESS;
const BRIDGE_ADDRESS = process.env.BRIDGE_ADDRESS;
const DESTINATION_TOKEN_ADDRESS = process.env.DESTINATION_TOKEN_ADDRESS;
const web3sepolia = new Web3(SEPOLIA_RPC_URL);
const web3mumbai = new Web3(MUMBAI_RPC_URL);

const port = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Running!");
});

app.listen(port, () => {
  execute();
});

const execute = async () => {
  const abiPath = path.resolve("../hardhatProject/artifacts/contracts");
  const rawDataBridgeContract = fs.readFileSync(abiPath + "/Bridge.json");
  const bridgeAbi = JSON.parse(rawDataBridgeContract);

  const contract = Contract({ abi: bridgeAbi });
  const provider = new WalletProvider(
    process.env.PROVIDER_KEY,
    SEPOLIA_RPC_URL
  );
  contract.setProvider(provider);
  const contractInstance = await contract.at(BRIDGE_ADDRESS);

  contractInstance.on("TokenLocked", (user, amount, event) => {
    // Here we should sign a transaction to mint tokens on the destination chain from the provider and return the signature.
    const eventDataObject = {
      user: user,
      amount: amount,
    };
    database.Locked.push(eventDataObject);
    console.log("Locked event: ", user, amount, event);
  });
};
