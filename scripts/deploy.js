const { ethers, network } = require("hardhat");

async function main() {
  console.log("=".repeat(60));
  console.log("VeriChain Credential Deployment");
  console.log("=".repeat(60));
  console.log(`Network: ${network.name}`);
  console.log(`Chain ID: ${network.config.chainId}`);
  console.log("");

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  console.log("");

  // Deploy contract
  console.log("Deploying VeriChainCredential...");
  const VeriChainCredential = await ethers.getContractFactory("VeriChainCredential");
  const verichain = await VeriChainCredential.deploy();
  
  await verichain.waitForDeployment();
  const contractAddress = await verichain.getAddress();

  console.log("");
  console.log("✅ VeriChainCredential deployed successfully!");
  console.log("=".repeat(60));
  console.log("Contract Address:", contractAddress);
  console.log("Owner Address:", deployer.address);
  console.log("=".repeat(60));

  // For local development, authorize the deployer as an institution for testing
  if (network.name === "localhost" || network.name === "hardhat") {
    console.log("");
    console.log("Local network detected - setting up test environment...");
    
    // Get additional test accounts
    const signers = await ethers.getSigners();
    if (signers.length > 1) {
      const testInstitution = signers[1];
      await verichain.authorizeInstitution(testInstitution.address);
      console.log("✅ Test institution authorized:", testInstitution.address);
    }
    
    // Also authorize deployer as institution for easy testing
    await verichain.authorizeInstitution(deployer.address);
    console.log("✅ Deployer authorized as institution for testing");
  }

  console.log("");
  console.log("📋 Next Steps:");
  console.log("1. Copy the contract address to your frontend config");
  console.log("2. Authorize institution wallets using authorizeInstitution()");
  console.log("3. Start issuing credentials!");
  console.log("");

  // Shardeum-specific instructions
  if (network.name === "shardeum" || network.name === "shardeumTestnet") {
    console.log("🔷 Shardeum Deployment Complete!");
    console.log("Explorer: https://explorer.shardeum.org/address/" + contractAddress);
    console.log("");
  }

  // Verification instructions for testnets
  if (network.name !== "localhost" && network.name !== "hardhat") {
    console.log("📝 Contract Verification:");
    console.log(`npx hardhat verify --network ${network.name} ${contractAddress}`);
    console.log("");
  }

  // Output deployment info for frontend configuration
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    contractAddress: contractAddress,
    deployerAddress: deployer.address,
    deploymentTime: new Date().toISOString(),
  };

  console.log("Deployment Info (for frontend):");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  return deploymentInfo;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
