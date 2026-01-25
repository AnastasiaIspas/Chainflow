import { useState } from "react";
import { ethers } from "ethers";

export function useWallet() {
  const [signer, setSigner] = useState(null);
  const [userAddress, setUserAddress] = useState("");
  const [networkInfo, setNetworkInfo] = useState(null);

  async function connectWallet() {
    try {
      if (!window.ethereum) return alert("MetaMask not detected. Install.");

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      
      const s = await provider.getSigner();
      const addr = await s.getAddress();
      const net = await provider.getNetwork();
      
      setSigner(s);
      setUserAddress(addr);
      setNetworkInfo({ chainId: Number(net.chainId), name: net.name });
    } catch (e) {
      const code = e?.code ?? e?.error?.code;
      if (code === -32002) {
        alert("A MetaMask request is already pending. Open MetaMask and approve/reject it, then try again");
        return;
      }
      console.error(e);
      alert(e?.shortMessage || e?.message || "Failed to connect wallet");
    }
  }

  return {
    signer,
    userAddress,
    networkInfo,
    connectWallet,
  };
}
