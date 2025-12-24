import { expect } from "chai";
import hre from "hardhat";

describe("Subscriptions", function () {
  async function deployFixture() {
    const connection = await hre.network.connect();
    const { ethers } = connection;

    const [merchant, user] = await ethers.getSigners();

    const PlanRegistry = await ethers.getContractFactory("PlanRegistry", merchant);
    const planRegistry = await PlanRegistry.deploy();
    await planRegistry.waitForDeployment();

    // planId = 0
    const price = ethers.parseEther("0.01");
    const interval = 60n;

    const tx = await planRegistry.createPlan("Basic", price, interval);
    await tx.wait();

    const SubscriptionManager = await ethers.getContractFactory("SubscriptionManager", merchant);
    const subMgr = await SubscriptionManager.deploy(await planRegistry.getAddress());
    await subMgr.waitForDeployment();

    return { ethers, merchant, user, planRegistry, subMgr, price, interval };
  }

  it("createPlan + subscribe works (happy path)", async function () {
    const { ethers, user, subMgr, price } = await deployFixture();

    const tx = await subMgr.connect(user).subscribe(0, { value: price });
    await tx.wait();

    const sub = await subMgr.subscriptions(user.address, 0);
    expect(sub.active).to.equal(true);
    expect(sub.nextPaymentAt).to.be.gt(0n);
  });

  it("subscribe reverts with wrong amount", async function () {
    const { user, subMgr } = await deployFixture();

    await expect(
      subMgr.connect(user).subscribe(0, { value: 1n })
    ).to.be.revertedWith("Wrong amount");
  });

  it("subscribe reverts if plan is inactive", async function () {
    const { user, planRegistry, subMgr, price } = await deployFixture();

    const tx = await planRegistry.setPlanActive(0, false);
    await tx.wait();

    await expect(
      subMgr.connect(user).subscribe(0, { value: price })
    ).to.be.revertedWith("Plan inactive");
  });

  it("pay reverts if too early, then succeeds after time passes", async function () {
    const { ethers, user, subMgr, price } = await deployFixture();

    // subscribe
    let tx = await subMgr.connect(user).subscribe(0, { value: price });
    await tx.wait();

    // too early
    await expect(
      subMgr.connect(user).pay(0, { value: price })
    ).to.be.revertedWith("Too early");

    // advance time > interval
    await ethers.provider.send("evm_increaseTime", [70]);
    await ethers.provider.send("evm_mine", []);

    // now pay should work
    tx = await subMgr.connect(user).pay(0, { value: price });
    await tx.wait();

    const sub = await subMgr.subscriptions(user.address, 0);
    expect(sub.active).to.equal(true);
    expect(sub.nextPaymentAt).to.be.gt(0n);
  });

  it("cancel sets subscription inactive", async function () {
    const { user, subMgr, price } = await deployFixture();

    let tx = await subMgr.connect(user).subscribe(0, { value: price });
    await tx.wait();

    tx = await subMgr.connect(user).cancel(0);
    await tx.wait();

    const sub = await subMgr.subscriptions(user.address, 0);
    expect(sub.active).to.equal(false);
  });

  it("markExpired works only after (nextPaymentAt + interval) has passed", async function () {
    const { ethers, user, subMgr, price } = await deployFixture();

    // subscribe
    let tx = await subMgr.connect(user).subscribe(0, { value: price });
    await tx.wait();

    // right now: not expired
    await expect(subMgr.connect(user).markExpired(0)).to.be.revertedWith("Not expired");

    // We need to pass nextPaymentAt + interval.
    // After subscribe: nextPaymentAt = now + interval
    // Expired if timestamp > (nextPaymentAt + interval) => now + 2*interval + epsilon
    await ethers.provider.send("evm_increaseTime", [130]); // > 120
    await ethers.provider.send("evm_mine", []);

    tx = await subMgr.connect(user).markExpired(0);
    await tx.wait();

    const sub = await subMgr.subscriptions(user.address, 0);
    expect(sub.active).to.equal(false);
  });
});
