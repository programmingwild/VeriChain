const hre = require("hardhat");

async function main() {
  // Get wallet address from command line argument
  const walletToAuthorize = process.env.WALLET;
  
  if (!walletToAuthorize) {
    console.log("\n❌ Please provide a wallet address!");
    console.log("\nUsage:");
    console.log('  $env:WALLET="0xYourFullWalletAddress"; npx hardhat run scripts/authorize-wallet.js --network localhost');
    console.log("\nExample:");
    console.log('  $env:WALLET="0xA303abc123...2DdD"; npx hardhat run scripts/authorize-wallet.js --network localhost');
    process.exit(1);
  }

  // Validate address format
  if (!/^0x[a-fA-F0-9]{40}$/.test(walletToAuthorize)) {
    console.log("\n❌ Invalid wallet address format!");
    console.log("Address must be 42 characters starting with 0x");
    process.exit(1);
  }

  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  const [owner] = await hre.ethers.getSigners();
  
  const VeriChain = await hre.ethers.getContractFactory("VeriChainCredential");
  const contract = VeriChain.attach(contractAddress);
  
  console.log("\n============================================================");
  console.log("VeriChain - Authorize Institution");
  console.log("============================================================");
  console.log("Contract:", contractAddress);
  console.log("Owner:", owner.address);
  console.log("Authorizing:", walletToAuthorize);
  
  // Check if already authorized
  const isAlreadyAuthorized = await contract.authorizedInstitutions(walletToAuthorize);
  if (isAlreadyAuthorized) {
    console.log("\n✅ This wallet is already authorized!");
    return;
  }
  
  // Authorize the wallet
  const tx = await contract.authorizeInstitution(walletToAuthorize);
  await tx.wait();
  
  console.log("\n✅ Wallet authorized successfully!");
  console.log("Transaction:", tx.hash);
  console.log("\n🔄 Refresh the Issue page (http://localhost:3000/issue)");
  console.log("   You should now see '✓ Authorized Institution' badge.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
