const hre = require("hardhat");

async function main() {
  console.log("Deploying SomniaPredictionMarket to Somnia Testnet...");

  try {
    const SomniaPredictionMarket = await hre.ethers.getContractFactory("SomniaPredictionMarket");
    
    console.log("Contract factory created, deploying...");
    
    // Deploy with specific gas settings
    const predictionMarket = await SomniaPredictionMarket.deploy({
      gasLimit: 5000000,
      gasPrice: hre.ethers.parseUnits("10", "gwei")
    });

    console.log("Waiting for deployment...");
    await predictionMarket.waitForDeployment();

    const address = await predictionMarket.getAddress();
    console.log("✅ SomniaPredictionMarket deployed to:", address);

    // Wait for confirmations
    console.log("Waiting for block confirmations...");
    const deploymentTx = predictionMarket.deploymentTransaction();
    if (deploymentTx) {
      await deploymentTx.wait(3);
      console.log("✅ Contract confirmed on blockchain");
    }

    console.log("🎉 Deployment successful!");
    console.log("Contract Address:", address);
    console.log("Network:", hre.network.name);
    console.log("Chain ID:", hre.network.config.chainId);

  } catch (error) {
    console.error("❌ Deployment failed:");
    console.error("Error:", error.message);
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error("💡 Tip: Make sure you have enough STT tokens for gas fees");
    } else if (error.code === 'NETWORK_ERROR') {
      console.error("💡 Tip: Check your network connection");
    }
    
    throw error;
  }
}

main()
  .then(() => {
    console.log("🚀 Deployment script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Deployment script failed:", error);
    process.exit(1);
  });
