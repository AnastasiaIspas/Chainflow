import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";

import PlanRegistryArtifact from "./abi/PlanRegistry.json";
import SubscriptionManagerArtifact from "./abi/SubscriptionManager.json";
import { PLAN_REGISTRY_ADDRESS, SUB_MANAGER_ADDRESS } from "./contracts";

export default function App() {
  const [signer, setSigner] = useState(null);
  const [userAddress, setUserAddress] = useState("");
  const [networkInfo, setNetworkInfo] = useState(null);

  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [txStatus, setTxStatus] = useState("");

  // Owner state
  const [isOwner, setIsOwner] = useState(false);
  const [currentOwner, setCurrentOwner] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [newRegistryAddress, setNewRegistryAddress] = useState("");
  const [newOwnerAddress, setNewOwnerAddress] = useState("");

  // Merchant withdrawal
  const [merchantBalance, setMerchantBalance] = useState("0");

  //create plan form with placeholder
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanPriceEth, setNewPlanPriceEth] = useState("");
  const [newPlanIntervalSec, setNewPlanIntervalSec] = useState("");
  const [copied, setCopied] = useState(false);

  const planRegistry = useMemo(() => {
    if (!signer) return null;
    return new ethers.Contract(
      PLAN_REGISTRY_ADDRESS,
      PlanRegistryArtifact.abi,
      signer
    );
  }, [signer]);

  const subMgr = useMemo(() => {
    if (!signer) return null;
    return new ethers.Contract(
      SUB_MANAGER_ADDRESS,
      SubscriptionManagerArtifact.abi,
      signer
    );
  }, [signer]);

  // function for connecting the wallet from metamask
  async function connectWallet() {
    try{
      if (!window.ethereum) return alert("MetaMask not detected.Install.");

      //check for permission from MetaMask to connect
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      //get the wallet address, where signer=the selected wallet in metamask
      const s = await provider.getSigner();
      const addr = await s.getAddress();
      const net = await provider.getNetwork();
      //save the connectiun in the UI
      setSigner(s);
      setUserAddress(addr);
      setNetworkInfo({ chainId: Number(net.chainId), name: net.name });
    } catch (e){
      const code = e?.code ?? e?.error?.code;
      if (code==-32002){
        alert("A MetaMask request is already pending. Open MetaMask and approve/reject it, then try again");
        return;
      }
      console.error(e);
      alert(e?.shortMessage || e?.message || "failed to connect wallet");
    
    }
  }
  //read plans
  async function loadPlans() {
    if (!planRegistry) return;
    setLoadingPlans(true);
    setTxStatus("");

    try {
      const count = await planRegistry.plansCount();
      const n = Number(count);

      const loaded = [];
      for (let i = 0; i < n; i++) {
        const [name, priceWei, intervalSec, merchant, active] =
          await planRegistry.getPlan(i);

        loaded.push({
          planId: i,
          name,
          priceWei,
          intervalSec: Number(intervalSec),
          merchant,
          active,
          subscription: null,
        });
      }
      setPlans(loaded);
      
      // Load subscription status for all plans if user is connected
      if (subMgr && userAddress) {
        for (let i = 0; i < n; i++) {
          await refreshSubscription(i);
        }
      }
    } catch (e) {
      console.error(e);
      alert("Could not read plans. Check ABI/adresses and make sure hardhat node is running");
    } finally {
      setLoadingPlans(false);
    }
  }
  //subscription status
  async function refreshSubscription(planId) {
    if (!subMgr || !userAddress) return;

    const sub = await subMgr.subscriptions(userAddress, planId);
    const subscription = {
      active: sub.active,
      nextPaymentAt: Number(sub.nextPaymentAt),
    };

    setPlans((prev) =>
      prev.map((p) => (p.planId === planId ? { ...p, subscription } : p))
    );
  }
  //actions for plan
  async function subscribe(plan) {
    if (!subMgr) return;
    setTxStatus("Estimating gas...");

    try {
      // Gas estimation - if this fails, the transaction would fail
      let gasEstimate;
      try {
        gasEstimate = await subMgr.subscribe.estimateGas(plan.planId, { value: plan.priceWei });
      } catch (estimateError) {
        // estimateGas failed = transaction would fail
        console.error("Gas estimation failed:", estimateError);
        setTxStatus("");
        
        // Check subscription status to give better error message
        const sub = await subMgr.subscriptions(userAddress, plan.planId);
        if (sub.active) {
          alert("Error: You are already subscribed to this plan!");
        } else {
          alert("Error: Unable to estimate gas. Transaction would likely fail.\n\nPossible reasons:\n- Plan is inactive\n- Incorrect payment amount\n- Contract issue");
        }
        return; // Stop here, don't send transaction
      }
      
      // Get gas price (with fallback for Hardhat)
      let gasPrice;
      try {
        const feeData = await signer.provider.getFeeData();
        gasPrice = feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('1', 'gwei');
      } catch {
        gasPrice = ethers.parseUnits('1', 'gwei'); // Fallback for Hardhat
      }
      
      const gasCostWei = gasEstimate * gasPrice;
      const gasCostEth = ethers.formatEther(gasCostWei);
      
      console.log(`Gas estimate: ${gasEstimate.toString()} units`);
      console.log(`Gas cost: ${gasCostEth} ETH`);
      
      setTxStatus(`Subscribing... (Est. gas: ${gasCostEth} ETH) - confirm in MetaMask`);

      const tx = await subMgr.subscribe(plan.planId, { 
        value: plan.priceWei,
        gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
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

  async function pay(plan) {
    if (!subMgr) return;
    setTxStatus("Estimating gas...");

    try {
      // Gas estimation - if this fails, the transaction would fail
      let gasEstimate;
      try {
        gasEstimate = await subMgr.pay.estimateGas(plan.planId, { value: plan.priceWei });
      } catch (estimateError) {
        // estimateGas failed = transaction would fail
        console.error("Gas estimation failed:", estimateError);
        setTxStatus("");
        
        // Check subscription status to give better error message
        const sub = await subMgr.subscriptions(userAddress, plan.planId);
        if (!sub.active) {
          alert("Error: You are not subscribed to this plan");
        } else if (sub.nextPaymentAt > 0) {
          const nextPaymentDate = new Date(Number(sub.nextPaymentAt) * 1000);
          alert(`Error: Payment is too early!\n\nYou can pay after: ${nextPaymentDate.toLocaleString()}\n\nThe interval hasn't passed yet.`);
        } else {
          alert("Error: Unable to estimate gas. Transaction would likely fail.");
        }
        return; // Stop here, don't send transaction
      }
      
      // Get gas price (with fallback for Hardhat)
      let gasPrice;
      try {
        const feeData = await signer.provider.getFeeData();
        gasPrice = feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('1', 'gwei');
      } catch {
        gasPrice = ethers.parseUnits('1', 'gwei'); // Fallback for Hardhat
      }
      
      const gasCostWei = gasEstimate * gasPrice;
      const gasCostEth = ethers.formatEther(gasCostWei);
      
      console.log(`Gas estimate: ${gasEstimate.toString()} units`);
      console.log(`Gas cost: ${gasCostEth} ETH`);
      
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

  async function cancel(plan) {
    if (!subMgr) return;
    setTxStatus("Estimating gas...");

    try {
      // Gas estimation
      const gasEstimate = await subMgr.cancel.estimateGas(plan.planId);
      
      // Get gas price (with fallback for Hardhat)
      let gasPrice;
      try {
        const feeData = await signer.provider.getFeeData();
        gasPrice = feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('1', 'gwei');
      } catch {
        gasPrice = ethers.parseUnits('1', 'gwei'); // Fallback for Hardhat
      }
      
      const gasCostWei = gasEstimate * gasPrice;
      const gasCostEth = ethers.formatEther(gasCostWei);
      
      console.log(`Gas estimate: ${gasEstimate.toString()} units`);
      console.log(`Gas cost: ${gasCostEth} ETH`);
      
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
  async function createPlan() {
  if (!planRegistry) return;
  setTxStatus("Estimating gas...");

  try {
    const name = (newPlanName || "Basic Plan").trim();
    const priceEth = (newPlanPriceEth || "0.01").trim();
    const intervalStr = (newPlanIntervalSec || "60").trim();

    const priceWei = ethers.parseEther(priceEth);
    const interval = BigInt(intervalStr);

    // Gas estimation
    const gasEstimate = await planRegistry.createPlan.estimateGas(name, priceWei, interval);
    
    // Get gas price (with fallback for Hardhat)
    let gasPrice;
    try {
      const feeData = await signer.provider.getFeeData();
      gasPrice = feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('1', 'gwei');
    } catch {
      gasPrice = ethers.parseUnits('1', 'gwei'); // Fallback for Hardhat
    }
    
    const gasCostWei = gasEstimate * gasPrice;
    const gasCostEth = ethers.formatEther(gasCostWei);
    
    console.log(`Gas estimate: ${gasEstimate.toString()} units`);
    console.log(`Gas cost: ${gasCostEth} ETH`);
    
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
    await loadPlans();
  } catch (e) {
    console.error(e);
    setTxStatus("");
    alert(e?.shortMessage || e?.message || "Create plan failed");
  }
}

  // Admin functions
  async function pauseContract() {
    if (!subMgr) return;
    setTxStatus("Pausing contract...");
    
    try {
      const tx = await subMgr.pause();
      setTxStatus("Transaction sent. Waiting for confirmation...");
      await tx.wait();
      setTxStatus("Contract paused");
      setIsPaused(true);
    } catch (e) {
      console.error(e);
      setTxStatus("");
      alert(e?.shortMessage || e?.message || "Pause failed");
    }
  }

  async function unpauseContract() {
    if (!subMgr) return;
    setTxStatus("Unpausing contract...");
    
    try {
      const tx = await subMgr.unpause();
      setTxStatus("Transaction sent. Waiting for confirmation...");
      await tx.wait();
      setTxStatus("Contract unpaused");
      setIsPaused(false);
    } catch (e) {
      console.error(e);
      setTxStatus("");
      alert(e?.shortMessage || e?.message || "Unpause failed");
    }
  }

  async function changePlanRegistry() {
    if (!subMgr || !newRegistryAddress) return;
    setTxStatus("Updating PlanRegistry address...");
    
    try {
      const tx = await subMgr.setPlanRegistry(newRegistryAddress);
      setTxStatus("Transaction sent. Waiting for confirmation...");
      await tx.wait();
      setTxStatus("PlanRegistry updated");
      setNewRegistryAddress("");
      alert("PlanRegistry address updated successfully!");
    } catch (e) {
      console.error(e);
      setTxStatus("");
      alert(e?.shortMessage || e?.message || "Update failed");
    }
  }

  async function emergencyWithdrawFunds() {
    if (!subMgr) return;
    if (!confirm("Are you sure you want to withdraw all contract funds?")) return;
    
    setTxStatus("Estimating gas...");
    
    try {
      // Gas estimation
      let gasEstimate;
      try {
        gasEstimate = await subMgr.emergencyWithdraw.estimateGas();
      } catch (estimateError) {
        console.error("Gas estimation failed:", estimateError);
        setTxStatus("");
        alert("Error: No funds in contract to withdraw!");
        return;
      }
      
      setTxStatus("Withdrawing funds...");
      
      const tx = await subMgr.emergencyWithdraw({ gasLimit: gasEstimate * 120n / 100n });
      setTxStatus("Transaction sent. Waiting for confirmation...");
      await tx.wait();
      setTxStatus("Funds withdrawn");
      alert("Contract funds withdrawn successfully!");
    } catch (e) {
      console.error(e);
      setTxStatus("");
      alert(e?.shortMessage || e?.message || "Withdrawal failed");
    }
  }

  async function transferOwnership() {
    if (!subMgr || !newOwnerAddress) return;
    if (!confirm(`Transfer ownership to ${newOwnerAddress}? This action cannot be undone!`)) return;
    
    setTxStatus("Transferring ownership...");
    
    try {
      const tx = await subMgr.transferOwnership(newOwnerAddress);
      setTxStatus("Transaction sent. Waiting for confirmation...");
      await tx.wait();
      setTxStatus("Ownership transferred");
      setNewOwnerAddress("");
      setIsOwner(false);
      alert("Ownership transferred successfully! You are no longer the owner.");
    } catch (e) {
      console.error(e);
      setTxStatus("");
      alert(e?.shortMessage || e?.message || "Transfer failed");
    }
  }

  async function withdrawMerchantFunds() {
    if (!subMgr) return;
    
    setTxStatus("Estimating gas...");
    
    try {
      // Gas estimation
      let gasEstimate;
      try {
        gasEstimate = await subMgr.withdraw.estimateGas();
      } catch (estimateError) {
        console.error("Gas estimation failed:", estimateError);
        setTxStatus("");
        alert("Error: No funds available to withdraw!");
        return;
      }
      
      setTxStatus("Withdrawing your funds...");
      
      const tx = await subMgr.withdraw({ gasLimit: gasEstimate * 120n / 100n });
      setTxStatus("Transaction sent. Waiting for confirmation...");
      await tx.wait();
      setTxStatus("Funds withdrawn successfully");
      await checkMerchantBalance();
      alert("Funds withdrawn to your wallet!");
    } catch (e) {
      console.error(e);
      setTxStatus("");
      alert(e?.shortMessage || e?.message || "Withdrawal failed");
    }
  }

  async function checkMerchantBalance() {
    if (!subMgr || !userAddress) return;
    
    try {
      const balance = await subMgr.pendingWithdrawals(userAddress);
      setMerchantBalance(ethers.formatEther(balance));
    } catch (e) {
      console.error("Error checking merchant balance:", e);
    }
  }

  function fmtEth(priceWei) {
    return ethers.formatEther(priceWei);
  }

  function fmtTime(ts) {
    if (!ts || ts === 0) return "-";
    return new Date(ts * 1000).toLocaleString();
  }
  function shortAddr(a){
    if (!a) return "";
    return a.slice(0,6) + "..." + a.slice(-4);
  }
  async function copyToClipboard(text){
    try{
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 900);
    }catch{
      //ignore
    }
  }

  // Load plans on mount
  useEffect(() => {
    if (planRegistry) loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planRegistry]);

  // Check if current user is owner and get contract status
  useEffect(() => {
    async function checkOwnerAndStatus() {
      if (!subMgr || !userAddress) return;
      
      try {
        const ownerAddress = await subMgr.owner();
        const pausedStatus = await subMgr.paused();
        
        setCurrentOwner(ownerAddress);
        setIsOwner(ownerAddress.toLowerCase() === userAddress.toLowerCase());
        setIsPaused(pausedStatus);
        
        console.log("Owner check:", {
          contractOwner: ownerAddress,
          currentUser: userAddress,
          isOwner: ownerAddress.toLowerCase() === userAddress.toLowerCase()
        });
      } catch (e) {
        console.error("Error checking owner:", e);
        setIsOwner(false);
        setIsPaused(false);
      }
      
      // Check merchant balance separately (don't let it block owner check)
      try {
        await checkMerchantBalance();
      } catch (e) {
        console.error("Error checking merchant balance:", e);
      }
    }
    
    checkOwnerAndStatus();
  }, [subMgr, userAddress]);

  // Setup event listeners (only for NEW events, not historical)
  useEffect(() => {
    if (!subMgr || !planRegistry || !userAddress) return;

    console.log("Setting up event listeners...");

    // Track processed events to avoid duplicates
    const processedEvents = new Set();

    // Define handlers with deduplication
    const handleSubscriptionActivated = (user, planId, nextPaymentAt, event) => {
      const eventId = `sub-activated-${event.log.blockNumber}-${event.log.transactionHash}-${event.log.index}`;
      if (processedEvents.has(eventId)) return;
      processedEvents.add(eventId);

      console.log("Event: SubscriptionActivated", { user, planId: Number(planId), nextPaymentAt: Number(nextPaymentAt) });
      if (user.toLowerCase() === userAddress.toLowerCase()) {
        refreshSubscription(Number(planId));
        setTxStatus(`Subscription activated for plan #${Number(planId)}`);
      }
    };

    const handlePaymentExecuted = (user, planId, paidAt, nextPaymentAt, amountWei, event) => {
      const eventId = `payment-${event.log.blockNumber}-${event.log.transactionHash}-${event.log.index}`;
      if (processedEvents.has(eventId)) return;
      processedEvents.add(eventId);

      console.log("Event: PaymentExecuted", { user, planId: Number(planId) });
      if (user.toLowerCase() === userAddress.toLowerCase()) {
        refreshSubscription(Number(planId));
      }
    };

    const handleSubscriptionCancelled = (user, planId, event) => {
      const eventId = `sub-cancelled-${event.log.blockNumber}-${event.log.transactionHash}-${event.log.index}`;
      if (processedEvents.has(eventId)) return;
      processedEvents.add(eventId);

      console.log("Event: SubscriptionCancelled", { user, planId: Number(planId) });
      if (user.toLowerCase() === userAddress.toLowerCase()) {
        refreshSubscription(Number(planId));
        setTxStatus(`Subscription cancelled for plan #${Number(planId)}`);
      }
    };

    const handleSubscriptionExpired = (user, planId, event) => {
      const eventId = `sub-expired-${event.log.blockNumber}-${event.log.transactionHash}-${event.log.index}`;
      if (processedEvents.has(eventId)) return;
      processedEvents.add(eventId);

      console.log("Event: SubscriptionExpired", { user, planId: Number(planId) });
      if (user.toLowerCase() === userAddress.toLowerCase()) {
        refreshSubscription(Number(planId));
        setTxStatus(`Subscription expired for plan #${Number(planId)}`);
      }
    };

    const handlePlanCreated = (planId, merchant, name, priceWei, intervalSec, event) => {
      const eventId = `plan-created-${event.log.blockNumber}-${event.log.transactionHash}-${event.log.index}`;
      if (processedEvents.has(eventId)) return;
      processedEvents.add(eventId);

      console.log("Event: PlanCreated", { planId: Number(planId), merchant, name });
      setTxStatus(`New plan created: ${name} (#${Number(planId)})`);
      loadPlans();
    };

    const handlePlanStatusChanged = (planId, active, event) => {
      const eventId = `plan-status-${event.log.blockNumber}-${event.log.transactionHash}-${event.log.index}`;
      if (processedEvents.has(eventId)) return;
      processedEvents.add(eventId);

      console.log("Event: PlanStatusChanged", { planId: Number(planId), active });
      setTxStatus(`Plan #${Number(planId)} status changed to ${active ? "active" : "inactive"}`);
      loadPlans();
    };

    // Remove any existing listeners
    subMgr.removeAllListeners();
    planRegistry.removeAllListeners();

    // Add listeners
    subMgr.on("SubscriptionActivated", handleSubscriptionActivated);
    subMgr.on("PaymentExecuted", handlePaymentExecuted);
    subMgr.on("SubscriptionCancelled", handleSubscriptionCancelled);
    subMgr.on("SubscriptionExpired", handleSubscriptionExpired);
    planRegistry.on("PlanCreated", handlePlanCreated);
    planRegistry.on("PlanStatusChanged", handlePlanStatusChanged);

    // Cleanup
    return () => {
      console.log("Cleaning up event listeners...");
      subMgr.removeAllListeners();
      planRegistry.removeAllListeners();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subMgr, planRegistry, userAddress]);

  //styling for the frontendddd
  const S ={
    page: {
      minHeight: "100vh",
      width: "100%",
      overflowX: "hidden",
      background:
        "radial-gradient(1200px 600px at 10% 10%, rgba(124,58,237,0.35), transparent 60%)," +
        "radial-gradient(1000px 600px at 90% 20%, rgba(59,130,246,0.28), transparent 60%)," +
        "radial-gradient(900px 500px at 50% 95%, rgba(236,72,153,0.18), transparent 60%)," +
        "linear-gradient(180deg, #0B0D1A 0%, #090A14 100%)",
      color: "#EAEAF2",
      fontFamily:
        "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      padding: 20,
    },
    container: {
      maxWidth: 1150,
      margin: "0 auto",
      position: "relative",
      padding: "0 12px",
    },
    glowGrid: {
      position: "absolute",
      inset: -30,
      pointerEvents: "none",
      backgroundImage: 
        "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
      backgroundSize: "44px 44px",
      maskImage: 
        "radial-gradient(closest-side at 50% 25%, rgba(0,0,0,1), rgba(0,0,0,0))",
      opacity: 0.55,
      filter: "blur(0.2px)",
    },
    hero: {
      display: "grid",
      gap: 14,
      padding: 22,
      borderRadius: 18,
      border: "1px solid rgba(255, 255, 255, 0.10)",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
      boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
      backdropFilter: "blur(8px)",
      position: "relative",
      overflow: "hidden",

    },
    heroFree: {
      paddingTop: 34,
      paddingBottom: 22,
      textAlign: "center",
      display: "grid",
      gap: 14,
      justifyItems: "center",
    },
    titleWrap: {
      display: "grid",
      gap: 10,
      justifyItems: "center",
      textAlign: "center",
    },

    title: {
      fontSize: 52,
      fontWeight: 900,
      letterSpacing: -0.8,
      margin: 0,
      lineHeight: 1.02,

      color: "transparent",
      backgroundImage:
        "linear-gradient(90deg, rgba(168,85,247,1), rgba(59,130,246,1), rgba(236,72,153,1), rgba(168,85,247,1))",
      backgroundSize: "220% 100%",
      backgroundClip: "text",
      WebkitBackgroundClip: "text",

      animation: "cf_titleIn 700ms cubic-bezier(.22,.61,.36,1) both, cf_shimmer 6s linear infinite",
    },

    subtitle: {
      margin: 0,
      opacity: 0.85,
      maxwidth: 720,
      lineHeight: 1.5,

    },
    
    row: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "center"},
    btnPrimary: {
      border: "0",
      padding: "10px 14px",
      borderRadius: 12,
      cursor: "pointer",
      fontWeight: 700,
      color: "white",
      background: 
        "linear-gradient(90deg, rgba(124,58,237,1), rgba(59,130,246,1))",
      boxShadow: "0 10px 24px rgba(59, 130, 246, 0.25)",
      transition: "transform 120ms ease, filter 120ms ease",
    },
    btnSecondary: {
      border: "1px solid rgba(255,255,255,0.14)",
      padding: "10px 14px",
      borderRadius: 12,
      cursor: "pointer",
      fontWeight: 700,
      color: "#EAEAF2",
      background: "rgba(255,255,255,0.04)",
      transition: "transform 120ms ease, filter 120ms ease",
    },
    btnDisabled: {opacity: 0.45, cursor: "not-allowed"},
    status:{
      marginTop: 10,
      padding: 12,
      borderRadius:14,
      border: "1px solid rgba(255,255,255,0.10)",
      background: "rgba(0,0,0,0.25)",
    },
    grid: {display:"grid", gap: 12, marginTop: 14},
    card: {
      borderRadius:18,
      border: "1px solid rgba(255,255,255,0.10)",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))",
      boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
      padding:16,
      position:"relative",
      overflow: "hidden",
    },
    cardGlow: {
      position: "absolute",
      inset: -2,
      background:
        "radial-gradient(400px 200px at 10% 10%, rgba(124,58,237,0.25), transparent 60%)," +
        "radial-gradient(350px 200px at 90% 30%, rgba(59,130,246,0.22), transparent 60%)",
      pointerEvents: "none",
      opacity: 0.9,
    },
    cardTop: {
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap",
      position: "relative",
    },
    cardTitle: { fontSize: 18, fontWeight: 800, marginBottom: 6 },
    mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas" },
    label: { fontSize: 12, opacity: 0.75, marginBottom: 6 },
    input: {
      width: "100%",
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(0,0,0,0.25)",
      color: "#EAEAF2",
      outline: "none",
    },
    formGrid: { display: "grid", gap: 10, maxWidth: 520 },
    divider: {
      height: 1,
      background: "rgba(255,255,255,0.10)",
      margin: "12px 0",
    },
    hint: { fontSize: 12, opacity: 0.75, marginTop: 8 },
    pill: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 10px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.14)",
      background: "rgba(0,0,0,0.18)",
    },
  };
  return (
    <div style={S.page}>
      <style>{`
        html, body, #root {
          width: 100%;
          max-width: 100%;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          background: #090A14;
        }
        * { box-sizing: border-box; }
        @keyframes cf_titleIn {
          from { opacity: 0; transform: translateY(10px); filter: blur(2px); }
          to   { opacity: 1; transform: translateY(0);   filter: blur(0); }
        }

        @keyframes cf_shimmer {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>

      <div style={S.container}>
        <div style={S.glowGrid} />

        <div style={S.heroFree}>
          <div style={S.titleWrap}>
            <div>
              <h1 style={S.title}>ChainFlow</h1>

              <p style={S.subtitle}>
                On-chain subscriptions with recurring payments. Connect your
                wallet, create a plan, subscribe, pay, and cancel — all on a
                local Hardhat network.
              </p>
            </div>

          </div>

          {!userAddress ? (
            <div style={S.row}>
              <button
                style={S.btnPrimary}
                onClick={connectWallet}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                Connect MetaMask
              </button>

              <span style={{ opacity: 0.75, fontSize: 13 }}>
                Make sure MetaMask is on chainId 31337 (Hardhat local).
              </span>
            </div>
          ) : (
            <div style={S.row}>
              <div style={S.pill}>
                <span style={{ opacity: 0.8 }}>Wallet</span>
                <span style={{ fontWeight: 800 }}>
                  {shortAddr(userAddress)}
                </span>
                <button
                  style={{
                    ...S.btnSecondary,
                    padding: "6px 10px",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  onClick={() => copyToClipboard(userAddress)}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <div style={S.pill}>
                <span style={{ opacity: 0.8 }}>Network</span>
                <span style={{ fontWeight: 800 }}>
                  {networkInfo?.name || "unknown"} (chainId {networkInfo?.chainId})
                </span>
              </div>

              {currentOwner && (
                <div style={{ ...S.pill, background: isOwner ? "rgba(234, 179, 8, 0.15)" : "rgba(59, 130, 246, 0.15)" }}>
                  <span style={{ opacity: 0.8 }}>Contract Owner</span>
                  <span style={{ fontWeight: 800, fontSize: 12 }}>
                    {shortAddr(currentOwner)} {isOwner && "👑"}
                  </span>
                </div>
              )}

              {networkInfo?.chainId !== 31337 && (
                <div style={{ color: "#FCA5A5", fontWeight: 700 }}>
                  Wrong network. Switch MetaMask to Hardhat local (31337).
                </div>
              )}
            </div>
          )}

          {txStatus && <div style={S.status}>{txStatus}</div>}
        </div>

        {/* Admin Panel - only for owner */}
        {isOwner && (
          <div style={{ ...S.card, marginTop: 14, border: "2px solid rgba(234, 179, 8, 0.3)" }}>
            <div style={S.cardGlow} />
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                <span>Admin Panel</span>
                <span style={{ fontSize: 14, background: "rgba(234, 179, 8, 0.2)", padding: "4px 10px", borderRadius: 8, color: "#eab308" }}>
                  OWNER
                </span>
              </div>
              <div style={{ opacity: 0.75, marginBottom: 16, fontSize: 13 }}>
                You have admin privileges for this contract
              </div>

              <div style={S.divider} />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>Contract Status</div>
                  <div style={{ 
                    padding: 12, 
                    borderRadius: 12, 
                    background: isPaused ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)",
                    border: `1px solid ${isPaused ? "rgba(239, 68, 68, 0.3)" : "rgba(34, 197, 94, 0.3)"}`,
                    fontSize: 15,
                    fontWeight: 700,
                    color: isPaused ? "#ef4444" : "#22c55e"
                  }}>
                    {isPaused ? "PAUSED" : "ACTIVE"}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>Emergency Controls</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      style={{
                        ...S.btnSecondary,
                        flex: 1,
                        background: isPaused ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                        borderColor: isPaused ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)",
                      }}
                      onClick={isPaused ? unpauseContract : pauseContract}
                    >
                      {isPaused ? "▶️ Unpause" : "⏸️ Pause"}
                    </button>
                    <button
                      style={{ ...S.btnSecondary, flex: 1 }}
                      onClick={emergencyWithdrawFunds}
                    >
                      💰 Withdraw
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>Update PlanRegistry Address</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    style={{ ...S.input, flex: 1 }}
                    placeholder="0x..."
                    value={newRegistryAddress}
                    onChange={(e) => setNewRegistryAddress(e.target.value)}
                  />
                  <button
                    style={{ ...S.btnPrimary, whiteSpace: "nowrap" }}
                    onClick={changePlanRegistry}
                    disabled={!newRegistryAddress}
                  >
                    Update
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, opacity: 0.9, color: "#eab308" }}>⚠️ Transfer Ownership</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
                  Transfer admin rights to another address. This action is permanent!
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    style={{ ...S.input, flex: 1 }}
                    placeholder="New owner address (0x...)"
                    value={newOwnerAddress}
                    onChange={(e) => setNewOwnerAddress(e.target.value)}
                  />
                  <button
                    style={{ 
                      ...S.btnPrimary, 
                      whiteSpace: "nowrap",
                      background: "rgba(234, 179, 8, 0.2)",
                      borderColor: "rgba(234, 179, 8, 0.3)",
                      color: "#eab308"
                    }}
                    onClick={transferOwnership}
                    disabled={!newOwnerAddress}
                  >
                    Transfer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Plan */}
        <div style={{ ...S.card, marginTop: 14 }}>
          <div style={S.cardGlow} />
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>Create Plan</div>
                <div style={{ opacity: 0.75, marginTop: 4, fontSize: 13 }}>
                  Use Account #0 (merchant) for creating plans.
                </div>
              </div>

              <div style={S.row}>
                <button
                  style={{
                    ...S.btnSecondary,
                    ...( !planRegistry || loadingPlans ? S.btnDisabled : null ),
                  }}
                  onClick={loadPlans}
                  disabled={!planRegistry || loadingPlans}
                >
                  {loadingPlans ? "Loading..." : "Reload plans"}
                </button>
              </div>
            </div>

            {/* Merchant Withdrawal */}
            {parseFloat(merchantBalance) > 0 && (
              <div style={{ 
                marginBottom: 16, 
                padding: 12, 
                background: "rgba(34, 197, 94, 0.1)", 
                border: "1px solid rgba(34, 197, 94, 0.3)",
                borderRadius: 12
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>💰 Pending Withdrawals</div>
                    <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{merchantBalance} ETH</div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                      Funds from your subscriptions ready to withdraw
                    </div>
                  </div>
                  <button
                    style={{
                      ...S.btnPrimary,
                      background: "rgba(34, 197, 94, 0.2)",
                      borderColor: "rgba(34, 197, 94, 0.4)",
                      color: "#22c55e"
                    }}
                    onClick={withdrawMerchantFunds}
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            )}

            <div style={S.divider} />

            <div style={S.formGrid}>
              <div>
                <div style={S.label}>Plan name</div>
                <input
                  style={S.input}
                  placeholder="Basic Plan"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={S.label}>Price (ETH)</div>
                  <input
                    style={S.input}
                    placeholder="0.01"
                    value={newPlanPriceEth}
                    onChange={(e) => setNewPlanPriceEth(e.target.value)}
                  />
                </div>

                <div>
                  <div style={S.label}>Interval (sec)</div>
                  <input
                    style={S.input}
                    placeholder="60"
                    value={newPlanIntervalSec}
                    onChange={(e) => setNewPlanIntervalSec(e.target.value)}
                  />
                </div>
              </div>

              <button
                style={{
                  ...S.btnPrimary,
                  ...( !planRegistry || !userAddress ? S.btnDisabled : null ),
                }}
                onClick={createPlan}
                disabled={!planRegistry || !userAddress}
              >
                Create plan
              </button>

              <div style={S.hint}>
                Tip: If you restart <span style={S.mono}>npx hardhat node</span>, you must redeploy contracts and plans will reset.
              </div>
            </div>
          </div>
        </div>

        {/* Plans */}
        {plans.length === 0 ? (
          <div style={{ ...S.card, marginTop: 14 }}>
            <div style={S.cardGlow} />
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>No plans yet</div>
              <div style={{ opacity: 0.8, marginTop: 6 }}>
                Create a plan using the form above, then reload.
              </div>
            </div>
          </div>
        ) : (
          <div style={S.grid}>
            {plans.map((p) => (
              <div key={p.planId} style={S.card}>
                <div style={S.cardGlow} />
                <div style={S.cardTop}>
                  <div>
                    <div style={S.cardTitle}>
                      #{p.planId} — {p.name}
                    </div>

                    <div style={{ display: "grid", gap: 6, opacity: 0.92 }}>
                      <div>
                        <span style={S.label}>Price</span>{" "}
                        <span style={{ fontWeight: 800 }}>{fmtEth(p.priceWei)} ETH</span>
                      </div>
                      <div>
                        <span style={S.label}>Interval</span>{" "}
                        <span style={{ fontWeight: 800 }}>{p.intervalSec} sec</span>
                      </div>
                      <div>
                        <span style={S.label}>Merchant</span>{" "}
                        <span style={{ ...S.mono, opacity: 0.95 }}>{p.merchant}</span>
                      </div>
                      <div>
                        <span style={S.label}>Active</span>{" "}
                        <span style={{ fontWeight: 800 }}>{String(p.active)}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ minWidth: 320 }}>
                    <button
                      style={{
                        ...S.btnSecondary,
                        ...( !subMgr || !userAddress ? S.btnDisabled : null ),
                      }}
                      onClick={() => refreshSubscription(p.planId)}
                      disabled={!subMgr || !userAddress}
                    >
                      Refresh subscription
                    </button>

                    <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                      <div>
                        <span style={S.label}>Subscribed</span>{" "}
                        <span style={{ fontWeight: 800 }}>
                          {p.subscription ? String(p.subscription.active) : "unknown"}
                        </span>
                      </div>
                      <div>
                        <span style={S.label}>Next payment</span>{" "}
                        <span style={{ fontWeight: 800 }}>
                          {p.subscription ? fmtTime(p.subscription.nextPaymentAt) : "unknown"}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                      <button
                        style={{
                          ...S.btnPrimary,
                          ...( !subMgr || !userAddress || !p.active ? S.btnDisabled : null ),
                        }}
                        onClick={() => subscribe(p)}
                        disabled={!subMgr || !userAddress || !p.active}
                      >
                        Subscribe
                      </button>

                      <button
                        style={{
                          ...S.btnSecondary,
                          ...( !subMgr || !userAddress || !p.active ? S.btnDisabled : null ),
                        }}
                        onClick={() => pay(p)}
                        disabled={!subMgr || !userAddress || !p.active}
                      >
                        Pay
                      </button>

                      <button
                        style={{
                          ...S.btnSecondary,
                          ...( !subMgr || !userAddress ? S.btnDisabled : null ),
                        }}
                        onClick={() => cancel(p)}
                        disabled={!subMgr || !userAddress}
                      >
                        Cancel
                      </button>
                    </div>

                    <div style={S.hint}>
                      If Pay fails with “Too early”, it’s normal — the interval hasn’t passed yet.
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ opacity: 0.55, fontSize: 12, marginTop: 18 }}>
          ChainFlow UI (local). Addresses:{" "}
          <span style={S.mono}>{PLAN_REGISTRY_ADDRESS}</span>{" "}
          · <span style={S.mono}>{SUB_MANAGER_ADDRESS}</span>
        </div>
      </div>
    </div>
  );
}
