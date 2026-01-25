import { useState, useCallback } from "react";

export function usePlans(planRegistry, subMgr, userAddress) {
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  const loadPlans = useCallback(async () => {
    if (!planRegistry) return;
    setLoadingPlans(true);

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
      alert("Could not read plans. Check ABI/addresses and make sure hardhat node is running");
    } finally {
      setLoadingPlans(false);
    }
  }, [planRegistry, subMgr, userAddress]);

  const refreshSubscription = useCallback(async (planId) => {
    if (!subMgr || !userAddress) return;

    const sub = await subMgr.subscriptions(userAddress, planId);
    const subscription = {
      active: sub.active,
      nextPaymentAt: Number(sub.nextPaymentAt),
    };

    setPlans((prev) =>
      prev.map((p) => (p.planId === planId ? { ...p, subscription } : p))
    );
  }, [subMgr, userAddress]);

  return {
    plans,
    loadingPlans,
    loadPlans,
    refreshSubscription,
  };
}
