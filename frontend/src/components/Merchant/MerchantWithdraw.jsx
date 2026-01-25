import { ethers } from "ethers";
import { S } from "../../styles/theme";
import { Button } from "../shared/Button";

export function MerchantWithdraw({ merchantBalance, subMgr, signer, setTxStatus, onWithdrawSuccess }) {
  async function withdrawMerchantFunds() {
    if (!subMgr) return;
    
    setTxStatus("Estimating gas...");
    
    try {
      let gasEstimate;
      try {
        gasEstimate = await subMgr.withdraw.estimateGas();
      } catch (estimateError) {
        console.error("Gas estimation failed:", estimateError);
        setTxStatus("");
        alert("Error: No funds to withdraw!");
        return;
      }
      
      let gasPrice;
      try {
        const feeData = await signer.provider.getFeeData();
        gasPrice = feeData.gasPrice || feeData.maxFeePerGas || ethers.parseUnits('1', 'gwei');
      } catch {
        gasPrice = ethers.parseUnits('1', 'gwei');
      }
      
      const gasCostWei = gasEstimate * gasPrice;
      const gasCostEth = ethers.formatEther(gasCostWei);
      
      setTxStatus(`Withdrawing... (Est. gas: ${gasCostEth} ETH) - confirm in MetaMask`);
      
      const tx = await subMgr.withdraw({ gasLimit: gasEstimate * 120n / 100n });
      setTxStatus("Transaction sent. Waiting for confirmation...");
      await tx.wait();
      setTxStatus("Funds withdrawn successfully");
      
      if (onWithdrawSuccess) {
        onWithdrawSuccess();
      }
    } catch (e) {
      console.error(e);
      setTxStatus("");
      
      if (e.message?.includes("No funds")) {
        alert("Error: No funds to withdraw");
      } else {
        alert(e?.shortMessage || e?.message || "Withdrawal failed");
      }
    }
  }

  if (parseFloat(merchantBalance) <= 0) {
    return null;
  }

  return (
    <div style={{ 
      ...S.card,
      marginTop: 14,
      background: "rgba(34, 197, 94, 0.08)",
      border: "1px solid rgba(34, 197, 94, 0.25)"
    }}>
      <div style={S.cardGlow} />
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>
              💰 Pending Withdrawals
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>
              {merchantBalance} ETH
            </div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
              Funds from your subscriptions ready to withdraw
            </div>
          </div>
          <Button
            style={{
              background: "rgba(34, 197, 94, 0.2)",
              borderColor: "rgba(34, 197, 94, 0.4)",
              color: "#22c55e"
            }}
            onClick={withdrawMerchantFunds}
          >
            Withdraw
          </Button>
        </div>
      </div>
    </div>
  );
}
