import { useEffect } from "react";

export function useEvents(subMgr, planRegistry, userAddress, refreshSubscription, loadPlans, setTxStatus) {
  useEffect(() => {
    if (!subMgr || !planRegistry || !userAddress) return;

    console.log("Setting up event listeners...");
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
}
