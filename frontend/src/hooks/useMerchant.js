import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

export function useMerchant(subMgr, userAddress) {
  const [merchantBalance, setMerchantBalance] = useState("0");

  const loadMerchantBalance = useCallback(async () => {
    if (!subMgr || !userAddress) {
      setMerchantBalance("0");
      return;
    }

    try {
      const bal = await subMgr.pendingWithdrawals(userAddress);
      setMerchantBalance(ethers.formatEther(bal));
    } catch (e) {
      console.error("Failed to load merchant balance:", e);
      setMerchantBalance("0");
    }
  }, [subMgr, userAddress]);

  useEffect(() => {
    loadMerchantBalance();
  }, [loadMerchantBalance]);

  return {
    merchantBalance,
    loadMerchantBalance,
  };
}
