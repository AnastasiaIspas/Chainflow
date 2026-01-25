import { ethers } from "ethers";
import { Button } from "../shared/Button";

export function SubscriptionActions({ plan, subMgr, userAddress, signer, refreshSubscription, setTxStatus }) {
  const isSubscribed = plan.subscription?.active;
  const currentTime = Date.now() / 1000;
  const nextPaymentAt = plan.subscription?.nextPaymentAt || 0;
  const canPay = isSubscribed && nextPaymentAt && currentTime >= nextPaymentAt;
  
  // Check if expired: currentTime > nextPaymentAt + interval
  const isExpired = isSubscribed && nextPaymentAt && 
                    currentTime > (nextPaymentAt + plan.intervalSec);
  
  // Export isExpired for PlanCard to use
  plan.isExpired = isExpired;

  async function subscribe() {
    if (!subMgr) return;
    setTxStatus("Estimating gas...");

    try {
      let gasEstimate;
      try {
        gasEstimate = await subMgr.subscribe.estimateGas(plan.planId, { value: plan.priceWei });
      } catch (estimateError) {
        console.error("Gas estimation failed:", estimateError);
        setTxStatus("");
        
        const sub = await subMgr.subscriptions(userAddress, plan.planId);
        if (sub.active) {
          alert("Error: You are already subscribed to this plan!");
        } else {
          alert("Error: Unable to estimate gas. Transaction would likely fail.");
        }
        return;
      }
      
      let gasPrice;
      try {
        const feeData = await signer.provider.getFeeData();
        gasPrice = feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('1', 'gwei');
      } catch {
        gasPrice = ethers.parseUnits('1', 'gwei');
      }
      
      const gasCostWei = gasEstimate * gasPrice;
      const gasCostEth = ethers.formatEther(gasCostWei);
      
      setTxStatus(`Subscribing... (Est. gas: ${gasCostEth} ETH) - confirm in MetaMask`);

      const tx = await subMgr.subscribe(plan.planId, { 
        value: plan.priceWei,
        gasLimit: gasEstimate * 120n / 100n
      });
      setTxStatus("Transaction sent. Waiting for confirmation...");
      await tx.wait();
      setTxStatus("Subscribed successfully");
      await refreshSubscription(plan.planId);
    } catch (e) {
      console.error(e);
      setTxStatus("");
      alert(e?.shortMessage || e?.message || "Subscribe failed");
    }
  }

  async function pay() {
    if (!subMgr) return;
    setTxStatus("Estimating gas...");

    try {
      let gasEstimate;
      try {
        gasEstimate = await subMgr.pay.estimateGas(plan.planId, { value: plan.priceWei });
      } catch (estimateError) {
        console.error("Gas estimation failed:", estimateError);
        setTxStatus("");
        
        const sub = await subMgr.subscriptions(userAddress, plan.planId);
        if (!sub.active) {
          alert("Error: You are not subscribed to this plan");
        } else if (sub.nextPaymentAt > 0) {
          const nextPaymentDate = new Date(Number(sub.nextPaymentAt) * 1000);
          alert(`Error: Payment is too early!\n\nYou can pay after: ${nextPaymentDate.toLocaleString()}`);
        } else {
          alert("Error: Unable to estimate gas. Transaction would likely fail.");
        }
        return;
      }
      
      let gasPrice;
      try {
        const feeData = await signer.provider.getFeeData();
        gasPrice = feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('1', 'gwei');
      } catch {
        gasPrice = ethers.parseUnits('1', 'gwei');
      }
      
      const gasCostWei = gasEstimate * gasPrice;
      const gasCostEth = ethers.formatEther(gasCostWei);
      
      setTxStatus(`Paying... (Est. gas: ${gasCostEth} ETH) - confirm in MetaMask`);

      const tx = await subMgr.pay(plan.planId, { 
        value: plan.priceWei,
        gasLimit: gasEstimate * 120n / 100n
      });
      setTxStatus("Transaction sent. Waiting for confirmation...");
      await tx.wait();
      setTxStatus("Payment successful");
      await refreshSubscription(plan.planId);
    } catch (e) {
      console.error(e);
      setTxStatus("");
      alert(e?.shortMessage || e?.message || "Payment failed");
    }
  }

  async function cancel() {
    if (!subMgr) return;
    setTxStatus("Estimating gas...");

    try {
      const gasEstimate = await subMgr.cancel.estimateGas(plan.planId);
      
      let gasPrice;
      try {
        const feeData = await signer.provider.getFeeData();
        gasPrice = feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('1', 'gwei');
      } catch {
        gasPrice = ethers.parseUnits('1', 'gwei');
      }
      
      const gasCostWei = gasEstimate * gasPrice;
      const gasCostEth = ethers.formatEther(gasCostWei);
      
      setTxStatus(`Cancelling... (Est. gas: ${gasCostEth} ETH) - confirm in MetaMask`);

      const tx = await subMgr.cancel(plan.planId, {
        gasLimit: gasEstimate * 120n / 100n
      });
      setTxStatus("Transaction sent. Waiting for confirmation...");
      await tx.wait();
      setTxStatus("Cancelled successfully");
      await refreshSubscription(plan.planId);
    } catch (e) {
      console.error(e);
      setTxStatus("");
      
      if (e.message?.includes("Not subscribed")) {
        alert("Error: You are not subscribed to this plan");
      } else {
        alert(e?.shortMessage || e?.message || "Cancel failed");
      }
    }
  }

  async function markExpired() {
    if (!subMgr) return;
    setTxStatus("Marking as expired...");

    try {
      const gasEstimate = await subMgr.markExpired.estimateGas(plan.planId);
      
      let gasPrice;
      try {
        const feeData = await signer.provider.getFeeData();
        gasPrice = feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('1', 'gwei');
      } catch {
        gasPrice = ethers.parseUnits('1', 'gwei');
      }
      
      const gasCostWei = gasEstimate * gasPrice;
      const gasCostEth = ethers.formatEther(gasCostWei);
      
      setTxStatus(`Marking expired... (Est. gas: ${gasCostEth} ETH) - confirm in MetaMask`);

      const tx = await subMgr.markExpired(plan.planId, {
        gasLimit: gasEstimate * 120n / 100n
      });
      setTxStatus("Transaction sent. Waiting for confirmation...");
      await tx.wait();
      setTxStatus("Subscription marked as expired");
      await refreshSubscription(plan.planId);
    } catch (e) {
      console.error(e);
      setTxStatus("");
      
      if (e.message?.includes("Not expired")) {
        alert("Error: Subscription is not expired yet");
      } else if (e.message?.includes("Not subscribed")) {
        alert("Error: You are not subscribed to this plan");
      } else {
        alert(e?.shortMessage || e?.message || "Mark expired failed");
      }
    }
  }

  if (!isSubscribed) {
    return (
      <Button onClick={subscribe} disabled={!plan.active}>
        {plan.active ? "Subscribe" : "Inactive"}
      </Button>
    );
  }

  // If expired, show both resubscribe and mark expired options
  if (isExpired) {
    return (
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button onClick={subscribe}>
          🔄 Resubscribe
        </Button>
        <Button 
          variant="secondary"
          style={{
            background: "rgba(239, 68, 68, 0.15)",
            borderColor: "rgba(239, 68, 68, 0.3)",
            color: "#ef4444"
          }}
          onClick={markExpired}
        >
          ⚠️ Mark Expired
        </Button>
        <Button variant="secondary" onClick={cancel}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Button onClick={pay} disabled={!canPay}>
        {canPay ? "Pay Now" : "Not Due Yet"}
      </Button>
      <Button variant="secondary" onClick={cancel}>
        Cancel
      </Button>
    </div>
  );
}
