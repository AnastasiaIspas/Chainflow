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

  const [newPlanName, setNewPlanName] = useState("Basic Plan");
  const [newPlanPriceEth, setNewPlanPriceEth] = useState("0.01");
  const [newPlanIntervalSec, setNewPlanIntervalSec] = useState("60");


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

  async function connectWallet() {
    if (!window.ethereum) return alert("Instalează MetaMask.");

    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const s = await provider.getSigner();
    const addr = await s.getAddress();
    const net = await provider.getNetwork();

    setSigner(s);
    setUserAddress(addr);
    setNetworkInfo({ chainId: Number(net.chainId), name: net.name });
  }

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
      alert("Nu pot citi planurile. Verifică ABI/adrese + hardhat node pornit.");
    } finally {
      setLoadingPlans(false);
    }
  }

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

  async function subscribe(plan) {
    if (!subMgr) return;
    setTxStatus("Subscribe... confirmă în MetaMask");

    try {
      const tx = await subMgr.subscribe(plan.planId, { value: plan.priceWei });
      setTxStatus("Tranzacție trimisă, aștept confirmarea...");
      await tx.wait();
      setTxStatus("Subscribed ✅");
      await refreshSubscription(plan.planId);
    } catch (e) {
      console.error(e);
      setTxStatus("");
      alert(e?.shortMessage || e?.message || "Eroare la subscribe");
    }
  }

  async function pay(plan) {
    if (!subMgr) return;
    setTxStatus("Pay... confirmă în MetaMask");

    try {
      const tx = await subMgr.pay(plan.planId, { value: plan.priceWei });
      setTxStatus("Tranzacție trimisă, aștept confirmarea...");
      await tx.wait();
      setTxStatus("Payment ✅");
      await refreshSubscription(plan.planId);
    } catch (e) {
      console.error(e);
      setTxStatus("");
      alert(e?.shortMessage || e?.message || "Eroare la pay (posibil Too early)");
    }
  }

  async function cancel(plan) {
    if (!subMgr) return;
    setTxStatus("Cancel... confirmă în MetaMask");

    try {
      const tx = await subMgr.cancel(plan.planId);
      setTxStatus("Tranzacție trimisă, aștept confirmarea...");
      await tx.wait();
      setTxStatus("Cancelled ✅");
      await refreshSubscription(plan.planId);
    } catch (e) {
      console.error(e);
      setTxStatus("");
      alert(e?.shortMessage || e?.message || "Eroare la cancel");
    }
  }
  async function createPlan() {
  if (!planRegistry) return;
  setTxStatus("Create plan... confirmă în MetaMask");

  try {
    const priceWei = ethers.parseEther(newPlanPriceEth);
    const interval = BigInt(newPlanIntervalSec);

    const tx = await planRegistry.createPlan(newPlanName, priceWei, interval);
    setTxStatus("Tranzacție trimisă, aștept confirmarea...");
    await tx.wait();

    setTxStatus("Plan creat ✅");
    await loadPlans();
  } catch (e) {
    console.error(e);
    setTxStatus("");
    alert(e?.shortMessage || e?.message || "Eroare la createPlan");
  }
}


  function fmtEth(priceWei) {
    return ethers.formatEther(priceWei);
  }

  function fmtTime(ts) {
    if (!ts || ts === 0) return "-";
    return new Date(ts * 1000).toLocaleString();
  }

  useEffect(() => {
    if (planRegistry) loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planRegistry]);

  return (
    <div style={{ fontFamily: "system-ui", padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h2>ChainFlow – Frontend (Hardhat local)</h2>

      {!userAddress ? (
        <button onClick={connectWallet}>Connect MetaMask</button>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <div><b>Wallet:</b> {userAddress}</div>
          <div><b>Network:</b> {networkInfo?.name} (chainId {networkInfo?.chainId})</div>
          {networkInfo?.chainId !== 31337 && (
            <div style={{ color: "crimson" }}>
              Schimbă rețeaua în MetaMask pe hardhat-local (chainId 31337).
            </div>
          )}
        </div>
      )}
        <div style={{ border: "1px solid #333", borderRadius: 12, padding: 12, margin: "12px 0" }}>
          <h3 style={{ marginTop: 0 }}>Create plan (merchant)</h3>

          <div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
            <label>
              Name
              <input
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                style={{ width: "100%", padding: 8, marginTop: 4 }}
              />
            </label>

            <label>
              Price (ETH)
              <input
                value={newPlanPriceEth}
                onChange={(e) => setNewPlanPriceEth(e.target.value)}
                style={{ width: "100%", padding: 8, marginTop: 4 }}
              />
            </label>

            <label>
              Interval (sec)
              <input
                value={newPlanIntervalSec}
                onChange={(e) => setNewPlanIntervalSec(e.target.value)}
                style={{ width: "100%", padding: 8, marginTop: 4 }}
              />
            </label>

            <button onClick={createPlan} disabled={!planRegistry || !userAddress}>
              Create Plan
            </button>
          </div>

          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
            Tip: planurile pot fi create doar de merchant (în demo folosiți Account #0).
          </div>
        </div>

      <div style={{ margin: "12px 0" }}>
        <button onClick={loadPlans} disabled={!planRegistry || loadingPlans}>
          {loadingPlans ? "Loading..." : "Reload plans"}
        </button>
      </div>

      {txStatus && <div style={{ padding: 10, background: "#f3f3f3", marginBottom: 12 }}>{txStatus}</div>}

      {plans.length === 0 ? (
        <div>
          <p><b>Nu există planuri încă.</b></p>
          <p>
            Asta e normal: deploy-ul vostru nu creează planuri.
            Următorul pas e să creăm 1 plan (prin script sau prin UI).
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {plans.map((p) => (
            <div key={p.planId} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    #{p.planId} – {p.name}
                  </div>
                  <div><b>Price:</b> {fmtEth(p.priceWei)} ETH</div>
                  <div><b>Interval:</b> {p.intervalSec} sec</div>
                  <div><b>Merchant:</b> {p.merchant}</div>
                  <div><b>Active plan:</b> {String(p.active)}</div>
                </div>

                <div style={{ minWidth: 280 }}>
                  <button onClick={() => refreshSubscription(p.planId)} disabled={!subMgr || !userAddress}>
                    Refresh subscription
                  </button>

                  <div style={{ marginTop: 8 }}>
                    <div><b>Subscribed:</b> {p.subscription ? String(p.subscription.active) : "(unknown)"}</div>
                    <div><b>Next payment at:</b> {p.subscription ? fmtTime(p.subscription.nextPaymentAt) : "(unknown)"}</div>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <button onClick={() => subscribe(p)} disabled={!subMgr || !userAddress || !p.active}>
                      Subscribe
                    </button>
                    <button onClick={() => pay(p)} disabled={!subMgr || !userAddress || !p.active}>
                      Pay
                    </button>
                    <button onClick={() => cancel(p)} disabled={!subMgr || !userAddress}>
                      Cancel
                    </button>
                  </div>

                  <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
                    Dacă Pay dă „Too early”, e normal (nu a venit scadența).
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
