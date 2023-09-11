import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: "https://sepolia.infura.io/v3/76c20b466e344a70af7aaff17ef028c3",
      chainId: 11155111,
      accounts: [
        "eb707b26189ecfe7fbdab4c931ea26ebee6c71540702884ec077cd4d429741cb",
      ],
    },
  },
};

export default config;
