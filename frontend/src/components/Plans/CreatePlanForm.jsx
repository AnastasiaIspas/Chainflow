import { useState } from "react";
import { ethers } from "ethers";
import { S } from "../../styles/theme";
import { Button } from "../shared/Button";

export function CreatePlanForm({ planRegistry, signer, onPlanCreated, setTxStatus }) {
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanPriceEth, setNewPlanPriceEth] = useState("");
  const [newPlanIntervalSec, setNewPlanIntervalSec] = useState("");

  async function createPlan() {
    if (!planRegistry) return;
    setTxStatus("Estimating gas...");

    try {
      const name = (newPlanName || "Basic Plan").trim();
      const priceEth = (newPlanPriceEth || "0.01").trim();
      const intervalStr = (newPlanIntervalSec || "60").trim();

      const priceWei = ethers.parseEther(priceEth);
      const interval = BigInt(intervalStr);

      const gasEstimate = await planRegistry.createPlan.estimateGas(name, priceWei, interval);
      
      let gasPrice;
      try {
        const feeData = await signer.provider.getFeeData();
        gasPrice = feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('1', 'gwei');
      } catch {
        gasPrice = ethers.parseUnits('1', 'gwei');
      }
      
      const gasCostWei = gasEstimate * gasPrice;
      const gasCostEth = ethers.formatEther(gasCostWei);
      
      setTxStatus(`Creating plan... (Est. gas: ${gasCostEth} ETH) - confirm in MetaMask`);

      const tx = await planRegistry.createPlan(name, priceWei, interval, {
        gasLimit: gasEstimate * 120n / 100n
      });
      setTxStatus("Transaction sent. Waiting for confirmation...");
      await tx.wait();

      setTxStatus("Plan created");
      setNewPlanName("");
      setNewPlanPriceEth("");
      setNewPlanIntervalSec("");
      onPlanCreated();
    } catch (e) {
      console.error(e);
      setTxStatus("");
      alert(e?.shortMessage || e?.message || "Create plan failed");
    }
  }

  return (
    <div style={S.formGrid}>
      <div>
        <div style={S.label}>Plan name</div>
        <input
          style={S.input}
          placeholder="e.g. Netflix Subscription"
          value={newPlanName}
          onChange={(e) => setNewPlanName(e.target.value)}
        />
      </div>

      <div>
        <div style={S.label}>Price (ETH)</div>
        <input
          style={S.input}
          type="number"
          step="0.001"
          placeholder="e.g. 0.01"
          value={newPlanPriceEth}
          onChange={(e) => setNewPlanPriceEth(e.target.value)}
        />
      </div>

      <div>
        <div style={S.label}>Interval (seconds)</div>
        <input
          style={S.input}
          type="number"
          placeholder="e.g. 2592000 (30 days)"
          value={newPlanIntervalSec}
          onChange={(e) => setNewPlanIntervalSec(e.target.value)}
        />
        <div style={S.hint}>
          Example: 60 = 1 min, 3600 = 1 hour, 86400 = 1 day, 2592000 = 30 days
        </div>
      </div>

      <Button onClick={createPlan} disabled={!planRegistry}>
        Create Plan
      </Button>
    </div>
  );
}
