const Contract = require("@truffle/contract");
const WalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require("web3");

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL;
const SOURCE_TOKEN_ADDRESS = process.env.CONTRACT_ADDRESS;
const BRIDGE_ADDRESS = process.env.BRIDGE_ADDRESS;
const DESTINATION_TOKEN_ADDRESS = process.env.DESTINATION_TOKEN_ADDRESS;

const web3sepolia = new Web3(new Web3.providers.HttpProvider(SEPOLIA_RPC_URL));
const web3mumbai = new Web3(new Web3.providers.HttpProvider(MUMBAI_RPC_URL));

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
};
