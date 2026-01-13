require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Helper to get valid accounts array
const getAccounts = () => {
  const key = process.env.PRIVATE_KEY;
  // Only use the key if it's a valid 64-char hex string (32 bytes)
  if (key && key.length === 64 && /^[0-9a-fA-F]+$/.test(key)) {
    return [key];
  }
  return [];
};

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // Polygon Mumbai Testnet (deprecated, use Amoy instead)
    polygonAmoy: {
      url: process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
      accounts: getAccounts(),
      chainId: 80002,
    },
    // Arbitrum Sepolia Testnet
    arbitrumSepolia: {
      url: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
      accounts: getAccounts(),
      chainId: 421614,
    },
    // Shardeum Mainnet
    shardeum: {
      url: process.env.SHARDEUM_RPC_URL || "https://api.shardeum.org",
      accounts: getAccounts(),
      chainId: 8118,
    },
    // Shardeum Testnet (Mezame)
    shardeumTestnet: {
      url: process.env.SHARDEUM_TESTNET_RPC_URL || "https://api-mezame.shardeum.org",
      accounts: getAccounts(),
      chainId: 8119,
    },
  },
  etherscan: {
    apiKey: {
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",
      arbitrumSepolia: process.env.ARBISCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
