import { useMemo } from "react";
import { ethers } from "ethers";
import PlanRegistryArtifact from "../abi/PlanRegistry.json";
import SubscriptionManagerArtifact from "../abi/SubscriptionManager.json";
import { PLAN_REGISTRY_ADDRESS, SUB_MANAGER_ADDRESS } from "../contracts";

export function useContracts(signer) {
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

  return { planRegistry, subMgr };
}
