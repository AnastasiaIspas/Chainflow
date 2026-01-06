import hre from "hardhat";

async function main() {
  const connection = await hre.network.connect();
  const { ethers } = connection;

  const [merchant] = await ethers.getSigners();
  console.log("Merchant:", merchant.address);

  const planRegistry = await ethers.getContractAt(
    "PlanRegistry",
    "0x5fbdb2315678afecb367f032d93f642f64180aa3",
    merchant
  );

  const price = ethers.parseEther("0.01");
  const interval = 60n;

  const tx = await planRegistry.createPlan("Basic Plan", price, interval);
  await tx.wait();

  console.log("✅ Plan creat!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
