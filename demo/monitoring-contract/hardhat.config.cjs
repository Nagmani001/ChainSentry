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
    sepolia: {
      url: process.env.RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
      accounts: privateKey ? [privateKey] : []
    }
  }
};
