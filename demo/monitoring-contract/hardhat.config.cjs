require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");

const privateKey = process.env.PRIVATE_KEY;

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    holesky: {
      url: process.env.RPC_URL || "https://ethereum-holesky-rpc.publicnode.com",
      accounts: privateKey ? [privateKey] : []
    },
    sepolia: {
      url: process.env.RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: privateKey ? [privateKey] : []
    }
  }
};
