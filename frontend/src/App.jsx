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
    setTxStatus("Subscribing... confirm in MetaMask");

    try {
      const tx = await subMgr.subscribe(plan.planId, { value: plan.priceWei });
      setTxStatus("Transaction sent. Waiting for confirmation...");
      await tx.wait();
      setTxStatus("Subscribed succesfully");
      await refreshSubscription(plan.planId);
    } catch (e) {
      console.error(e);
      setTxStatus("");
      alert(e?.shortMessage || e?.message || "Subscribed failed");
    }
  }

  async function pay(plan) {
    if (!subMgr) return;
    setTxStatus("Paying... confirm in MetaMask");

    try {
      const tx = await subMgr.pay(plan.planId, { value: plan.priceWei });
      setTxStatus("Tranzaction sent. Waitinf fotr confirmation...");
      await tx.wait();
      setTxStatus("Payment successful");
      await refreshSubscription(plan.planId);
    } catch (e) {
      console.error(e);
      setTxStatus("");
      alert(e?.shortMessage || e?.message || "Pay failed (maybe too early)");
    }
  }

  async function cancel(plan) {
    if (!subMgr) return;
    setTxStatus("Cancelling... confirm  in Metamask");

    try {
      const tx = await subMgr.cancel(plan.planId);
      setTxStatus("Tranzaction sent. Waiting fpr confirmation...");
      await tx.wait();
      setTxStatus("Cancelled successfully");
      await refreshSubscription(plan.planId);
    } catch (e) {
      console.error(e);
      setTxStatus("");
      alert(e?.shortMessage || e?.message || "Cancel failed");
    }
  }
  async function createPlan() {
  if (!planRegistry) return;
  setTxStatus("Creating plan.. confirm in MetaMask");

  try {
    const name = (newPlanName || "Basic Plan").trim();
    const priceEth = (newPlanPriceEth || "0.01").trim();
    const intervalStr = (newPlanIntervalSec || "60").trim();

    const priceWei = ethers.parseEther(priceEth);
    const interval = BigInt(intervalStr);

    const tx = await planRegistry.createPlan(name, priceWei, interval);
    setTxStatus("Tranzaction sent. Waiting for connection...");
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

  useEffect(() => {
    if (planRegistry) loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planRegistry]);

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
      width: "100%",
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
                Make sure MetaMask is on chainId 31337 (Hardhat local)
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

              {networkInfo?.chainId !== 31337 && (
                <div style={{ color: "#FCA5A5", fontWeight: 700 }}>
                  Wrong network. Switch MetaMask to Hardhat local (31337).
                </div>
              )}
            </div>
          )}

          {txStatus && <div style={S.status}>{txStatus}</div>}
        </div>

        {/* Create Plan */}
        <div style={{ ...S.card, marginTop: 14 }}>
          <div style={S.cardGlow} />
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
