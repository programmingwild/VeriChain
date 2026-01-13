const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying VeriChainCredentialHybrid...\n");
  console.log("Network:", hre.network.name);
  console.log("");

  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  
  console.log("📍 Deployer address:", deployer.address);
  console.log("");

  // Deploy the hybrid contract
  const VeriChainCredentialHybrid = await hre.ethers.getContractFactory("VeriChainCredentialHybrid");
  const contract = await VeriChainCredentialHybrid.deploy(deployer.address);
  
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  console.log("✅ VeriChainCredentialHybrid deployed to:", contractAddress);

  // Authorize the deployer as institution
  console.log("\n🏛️  Authorizing deployer as institution...");
  const authTx = await contract.authorizeInstitution(deployer.address);
  await authTx.wait();
  console.log("✅ Deployer authorized as institution:", deployer.address);

  // Verify authorization
  const isAuthorized = await contract.authorizedInstitutions(deployer.address);
  console.log("✅ Authorization verified:", isAuthorized);

  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("Contract Name:      VeriChainCredentialHybrid");
  console.log("Contract Address:   ", contractAddress);
  console.log("Owner:              ", deployer.address);
  console.log("Network:            ", hre.network.name);
  console.log("=".repeat(60));

  console.log("\n📝 Add this to your .env.local:");
  console.log(`NEXT_PUBLIC_HYBRID_CONTRACT_ADDRESS=${contractAddress}`);

  console.log("\n🔐 Hybrid credential features:");
  console.log("   • issueCredential() - Standard public credential");
  console.log("   • issueCredentialWithPrivateData() - With encrypted data");
  console.log("   • grantPrivateDataAccess() - Share encrypted data");
  console.log("   • getPrivateData() - Retrieve encrypted handles");
  console.log("");

  return contractAddress;
}

main()
  .then((address) => {
    console.log("✨ Deployment complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
