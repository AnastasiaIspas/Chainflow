import { useState, useEffect } from "react";
import { S } from "./styles/theme";
import { useWallet } from "./hooks/useWallet";
import { useContracts } from "./hooks/useContracts";
import { usePlans } from "./hooks/usePlans";
import { useAdmin } from "./hooks/useAdmin";
import { useMerchant } from "./hooks/useMerchant";
import { useEvents } from "./hooks/useEvents";
import { Header } from "./components/Header/Header";
import { TxStatus } from "./components/shared/TxStatus";
import { AdminPanel } from "./components/Admin/AdminPanel";
import { MerchantWithdraw } from "./components/Merchant/MerchantWithdraw";
import { CreatePlanForm } from "./components/Plans/CreatePlanForm";
import { PlansList } from "./components/Plans/PlansList";
import { Button } from "./components/shared/Button";

export default function App() {
  const [txStatus, setTxStatus] = useState("");
  const [copied, setCopied] = useState(false);

  const { signer, userAddress, networkInfo, connectWallet } = useWallet();
  const { planRegistry, subMgr } = useContracts(signer);
  const { plans, loadingPlans, loadPlans, refreshSubscription } = usePlans(planRegistry, subMgr, userAddress);
  const { isOwner, currentOwner, isPaused, setIsPaused, setIsOwner } = useAdmin(subMgr, userAddress);
  const { merchantBalance, loadMerchantBalance } = useMerchant(subMgr, userAddress);

  useEvents(subMgr, planRegistry, userAddress, refreshSubscription, loadPlans, setTxStatus);

  useEffect(() => {
    if (planRegistry && subMgr) {
      loadPlans();
    }
  }, [planRegistry, subMgr]);

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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

        <Header
          userAddress={userAddress}
          networkInfo={networkInfo}
          currentOwner={currentOwner}
          isOwner={isOwner}
          onConnect={connectWallet}
          copied={copied}
          onCopy={copyToClipboard}
        />

        {txStatus && <TxStatus status={txStatus} />}

        {isOwner && (
          <AdminPanel
            subMgr={subMgr}
            isPaused={isPaused}
            setIsPaused={setIsPaused}
            setIsOwner={setIsOwner}
            setTxStatus={setTxStatus}
          />
        )}

        <MerchantWithdraw
          merchantBalance={merchantBalance}
          subMgr={subMgr}
          signer={signer}
          setTxStatus={setTxStatus}
          onWithdrawSuccess={loadMerchantBalance}
        />

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

              <Button
                variant="secondary"
                onClick={loadPlans}
                disabled={!planRegistry || loadingPlans}
              >
                {loadingPlans ? "Loading..." : "Reload Plans"}
              </Button>
            </div>

            <div style={S.divider} />

            <CreatePlanForm
              planRegistry={planRegistry}
              signer={signer}
              onPlanCreated={loadPlans}
              setTxStatus={setTxStatus}
            />
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 12 }}>
            Available Plans
          </div>
          
          <PlansList
            plans={plans}
            loadingPlans={loadingPlans}
            subMgr={subMgr}
            userAddress={userAddress}
            signer={signer}
            refreshSubscription={refreshSubscription}
            setTxStatus={setTxStatus}
          />
        </div>
      </div>
    </div>
  );
}
