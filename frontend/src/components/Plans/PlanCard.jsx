import { ethers } from "ethers";
import { S } from "../../styles/theme";
import { SubscriptionActions } from "./SubscriptionActions";

export function PlanCard({ plan, subMgr, userAddress, signer, refreshSubscription, setTxStatus }) {
  const priceEth = ethers.formatEther(plan.priceWei);
  
  // Calculate interval display
  let intervalStr;
  const seconds = plan.intervalSec;
  
  if (seconds >= 86400) {
    const days = Math.floor(seconds / 86400);
    intervalStr = `${days} day${days > 1 ? 's' : ''}`;
  } else if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    intervalStr = `${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    intervalStr = `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    intervalStr = `${seconds} second${seconds > 1 ? 's' : ''}`;
  }

  const isSubscribed = plan.subscription?.active;
  const nextPayment = plan.subscription?.nextPaymentAt 
    ? new Date(plan.subscription.nextPaymentAt * 1000).toLocaleString()
    : null;

  // Check if expired
  const currentTime = Date.now() / 1000;
  const isExpired = isSubscribed && plan.subscription?.nextPaymentAt && 
                    currentTime > (plan.subscription.nextPaymentAt + plan.intervalSec);

  return (
    <div style={S.card}>
      <div style={S.cardGlow} />
      <div style={{ position: "relative" }}>
        <div style={S.cardTop}>
          <div>
            <div style={S.cardTitle}>{plan.name}</div>
            <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>
              {priceEth} ETH
              <span style={{ fontSize: 14, opacity: 0.75, fontWeight: 600, marginLeft: 8 }}>
                / {intervalStr}
              </span>
            </div>
            <div style={{ fontSize: 12, opacity: 0.65, ...S.mono }}>
              Merchant: {plan.merchant.slice(0, 6)}...{plan.merchant.slice(-4)}
            </div>
          </div>

          <div style={{ 
            padding: "6px 12px", 
            borderRadius: 8,
            background: plan.active ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${plan.active ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            color: plan.active ? "#22c55e" : "#ef4444",
            fontSize: 12,
            fontWeight: 700,
            alignSelf: "start"
          }}>
            {plan.active ? "Active" : "Inactive"}
          </div>
        </div>

        {isSubscribed && (
          <div style={{ 
            marginTop: 12,
            padding: 10,
            background: isExpired ? "rgba(239, 68, 68, 0.1)" : "rgba(59, 130, 246, 0.1)",
            border: `1px solid ${isExpired ? "rgba(239, 68, 68, 0.25)" : "rgba(59, 130, 246, 0.25)"}`,
            borderRadius: 10
          }}>
            <div style={{ 
              fontSize: 12, 
              fontWeight: 700, 
              color: isExpired ? "#ef4444" : "#3b82f6", 
              marginBottom: 4 
            }}>
              {isExpired ? "⚠️ Expired" : "✓ Subscribed"}
            </div>
            {nextPayment && (
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                {isExpired ? "Last payment due: " : "Next payment: "}{nextPayment}
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          <SubscriptionActions 
            plan={plan}
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
