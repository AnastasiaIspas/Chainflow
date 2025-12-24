import hre from "hardhat";

async function main() {
  const connection = await hre.network.connect();
  const { ethers } = connection;

  const PlanRegistry = await ethers.getContractFactory("PlanRegistry");
  const planRegistry = await PlanRegistry.deploy();
  await planRegistry.waitForDeployment();
  const planRegistryAddress = await planRegistry.getAddress();
  console.log("PlanRegistry:", planRegistryAddress);

  const SubscriptionManager = await ethers.getContractFactory("SubscriptionManager");
  const subscriptionManager = await SubscriptionManager.deploy(planRegistryAddress);
  await subscriptionManager.waitForDeployment();
  const subscriptionManagerAddress = await subscriptionManager.getAddress();
  console.log("SubscriptionManager:", subscriptionManagerAddress);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
