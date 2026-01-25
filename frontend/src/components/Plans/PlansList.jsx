import { S } from "../../styles/theme";
import { PlanCard } from "./PlanCard";
import { LoadingSpinner } from "../shared/LoadingSpinner";

export function PlansList({ plans, loadingPlans, subMgr, userAddress, signer, refreshSubscription, setTxStatus }) {
  if (loadingPlans) {
    return <LoadingSpinner />;
  }

  if (plans.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, opacity: 0.75 }}>
        No plans yet. Create one above!
      </div>
    );
  }

  return (
    <div style={S.grid}>
      {plans.map((plan) => (
        <PlanCard
          key={plan.planId}
          plan={plan}
          subMgr={subMgr}
          userAddress={userAddress}
          signer={signer}
          refreshSubscription={refreshSubscription}
          setTxStatus={setTxStatus}
        />
      ))}
    </div>
  );
}
