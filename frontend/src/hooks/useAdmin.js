import { useState, useEffect, useCallback } from "react";

export function useAdmin(subMgr, userAddress) {
  const [isOwner, setIsOwner] = useState(false);
  const [currentOwner, setCurrentOwner] = useState("");
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!subMgr || !userAddress) {
      setIsOwner(false);
      setCurrentOwner("");
      setIsPaused(false);
      return;
    }

    async function checkOwnerAndPauseStatus() {
      try {
        const owner = await subMgr.owner();
        setCurrentOwner(owner);
        setIsOwner(owner.toLowerCase() === userAddress.toLowerCase());
        
        const paused = await subMgr.paused();
        setIsPaused(paused);
      } catch (e) {
        console.error("Failed to check owner/pause status:", e);
      }
    }

    checkOwnerAndPauseStatus();
  }, [subMgr, userAddress]);

  return {
    isOwner,
    currentOwner,
    isPaused,
    setIsPaused,
    setIsOwner,
  };
}
