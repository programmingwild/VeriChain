const hre = require("hardhat");

async function main() {
  // Get the wallet address to authorize from command line or use deployer
  const [owner] = await hre.ethers.getSigners();
  const walletToAuthorize = process.env.WALLET || owner.address;
  
  // Contract address - use env or Shardeum Testnet deployment
  const contractAddress = process.env.CONTRACT || "0x8464135c8F25Da09e49BC8782676a84730C318bC";
  
  const VeriChain = await hre.ethers.getContractFactory("VeriChainCredential");
  const contract = VeriChain.attach(contractAddress);
  
  console.log("\n============================================================");
  console.log("VeriChain - Authorize Institution");
  console.log("============================================================");
  console.log("Network:", hre.network.name);
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
  console.log("\nRefresh the Issue page and you should see 'Authorized Institution' badge.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
