import { useState } from "react";
import { S } from "../../styles/theme";
import { Button } from "../shared/Button";

export function AdminPanel({ subMgr, isPaused, setIsPaused, setIsOwner, setTxStatus }) {
  const [newRegistryAddress, setNewRegistryAddress] = useState("");
  const [newOwnerAddress, setNewOwnerAddress] = useState("");

  async function pauseContract() {
    if (!subMgr) return;
    setTxStatus("Pausing contract...");
    
    try {
      const tx = await subMgr.pause();
      setTxStatus("Transaction sent. Waiting for confirmation...");
      await tx.wait();
      setTxStatus("Contract paused");
      setIsPaused(true);
    } catch (e) {
      console.error(e);
      setTxStatus("");
      alert(e?.shortMessage || e?.message || "Pause failed");
    }
  }

  async function unpauseContract() {
    if (!subMgr) return;
    setTxStatus("Unpausing contract...");
    
    try {
      const tx = await subMgr.unpause();
      setTxStatus("Transaction sent. Waiting for confirmation...");
      await tx.wait();
      setTxStatus("Contract unpaused");
      setIsPaused(false);
    } catch (e) {
      console.error(e);
      setTxStatus("");
      alert(e?.shortMessage || e?.message || "Unpause failed");
    }
  }

  async function changePlanRegistry() {
    if (!subMgr || !newRegistryAddress) return;
    setTxStatus("Updating PlanRegistry address...");
    
    try {
      const tx = await subMgr.setPlanRegistry(newRegistryAddress);
      setTxStatus("Transaction sent. Waiting for confirmation...");
      await tx.wait();
      setTxStatus("PlanRegistry updated");
      setNewRegistryAddress("");
      alert("PlanRegistry address updated successfully!");
    } catch (e) {
      console.error(e);
      setTxStatus("");
      alert(e?.shortMessage || e?.message || "Update failed");
    }
  }

  async function emergencyWithdrawFunds() {
    if (!subMgr) return;
    if (!confirm("Are you sure you want to withdraw all contract funds?")) return;
    
    setTxStatus("Estimating gas...");
    
    try {
      let gasEstimate;
      try {
        gasEstimate = await subMgr.emergencyWithdraw.estimateGas();
      } catch (estimateError) {
        console.error("Gas estimation failed:", estimateError);
        setTxStatus("");
        alert("Error: No funds in contract to withdraw!");
        return;
      }
      
      setTxStatus("Withdrawing funds...");
      
      const tx = await subMgr.emergencyWithdraw({ gasLimit: gasEstimate * 120n / 100n });
      setTxStatus("Transaction sent. Waiting for confirmation...");
      await tx.wait();
      setTxStatus("Funds withdrawn");
      alert("Contract funds withdrawn successfully!");
    } catch (e) {
      console.error(e);
      setTxStatus("");
      alert(e?.shortMessage || e?.message || "Withdrawal failed");
    }
  }

  async function transferOwnership() {
    if (!subMgr || !newOwnerAddress) return;
    if (!confirm(`Transfer ownership to ${newOwnerAddress}? This action cannot be undone!`)) return;
    
    setTxStatus("Transferring ownership...");
    
    try {
      const tx = await subMgr.transferOwnership(newOwnerAddress);
      setTxStatus("Transaction sent. Waiting for confirmation...");
      await tx.wait();
      setTxStatus("Ownership transferred");
      setNewOwnerAddress("");
      setIsOwner(false);
      alert("Ownership transferred successfully! You are no longer the owner.");
    } catch (e) {
      console.error(e);
      setTxStatus("");
      alert(e?.shortMessage || e?.message || "Transfer failed");
    }
  }

  return (
    <div style={{ ...S.card, marginTop: 14, border: "2px solid rgba(234, 179, 8, 0.3)" }}>
      <div style={S.cardGlow} />
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
          <span>Admin Panel</span>
          <span style={{ fontSize: 14, background: "rgba(234, 179, 8, 0.2)", padding: "4px 10px", borderRadius: 8, color: "#eab308" }}>
            OWNER
          </span>
        </div>
        <div style={{ opacity: 0.75, marginBottom: 16, fontSize: 13 }}>
          You have admin privileges for this contract
        </div>

        <div style={S.divider} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>Contract Status</div>
            <div style={{ 
              padding: 12, 
              borderRadius: 12, 
              background: isPaused ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)",
              border: `1px solid ${isPaused ? "rgba(239, 68, 68, 0.3)" : "rgba(34, 197, 94, 0.3)"}`,
              fontSize: 15,
              fontWeight: 700,
              color: isPaused ? "#ef4444" : "#22c55e"
            }}>
              {isPaused ? "PAUSED" : "ACTIVE"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>Emergency Controls</div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                variant="secondary"
                style={{
                  flex: 1,
                  background: isPaused ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  borderColor: isPaused ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)",
                }}
                onClick={isPaused ? unpauseContract : pauseContract}
              >
                {isPaused ? "▶️ Unpause" : "⏸️ Pause"}
              </Button>
              <Button
                variant="secondary"
                style={{ flex: 1 }}
                onClick={emergencyWithdrawFunds}
              >
                💰 Withdraw
              </Button>
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, opacity: 0.9 }}>Update PlanRegistry Address</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...S.input, flex: 1 }}
              placeholder="0x..."
              value={newRegistryAddress}
              onChange={(e) => setNewRegistryAddress(e.target.value)}
            />
            <Button
              style={{ whiteSpace: "nowrap" }}
              onClick={changePlanRegistry}
              disabled={!newRegistryAddress}
            >
              Update
            </Button>
          </div>
        </div>

        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, opacity: 0.9, color: "#eab308" }}>
            ⚠️ Transfer Ownership
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
            Transfer admin rights to another address. This action is permanent!
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...S.input, flex: 1 }}
              placeholder="New owner address (0x...)"
              value={newOwnerAddress}
              onChange={(e) => setNewOwnerAddress(e.target.value)}
            />
            <Button
              style={{ 
                whiteSpace: "nowrap",
                background: "rgba(234, 179, 8, 0.2)",
                borderColor: "rgba(234, 179, 8, 0.3)",
                color: "#eab308"
              }}
              onClick={transferOwnership}
              disabled={!newOwnerAddress}
            >
              Transfer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
