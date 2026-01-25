import { S } from "../../styles/theme";
import { Button } from "../shared/Button";

export function Header({ userAddress, networkInfo, currentOwner, isOwner, onConnect, copied, onCopy }) {
  const shortAddr = (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div style={S.heroFree}>
      <div style={S.titleWrap}>
        <div>
          <h1 style={S.title}>ChainFlow</h1>
          <p style={S.subtitle}>
            On-chain subscriptions with recurring payments. Connect your
            wallet, create a plan, subscribe, pay, and cancel — all on a
            local Hardhat network.
          </p>
        </div>
      </div>

      {!userAddress ? (
        <div style={S.row}>
          <Button onClick={onConnect}>
            Connect MetaMask
          </Button>
          <span style={{ opacity: 0.75, fontSize: 13 }}>
            Make sure MetaMask is on chainId 31337 (Hardhat local).
          </span>
        </div>
      ) : (
        <div style={S.row}>
          <div style={S.pill}>
            <span style={{ opacity: 0.8 }}>Wallet</span>
            <span style={{ fontWeight: 800 }}>
              {shortAddr(userAddress)}
            </span>
            <button
              style={{
                ...S.btnSecondary,
                padding: "6px 10px",
                borderRadius: 10,
                fontSize: 12,
              }}
              onClick={() => onCopy(userAddress)}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div style={S.pill}>
            <span style={{ opacity: 0.8 }}>Network</span>
            <span style={{ fontWeight: 800 }}>
              {networkInfo?.name || "unknown"} (chainId {networkInfo?.chainId})
            </span>
          </div>

          {currentOwner && (
            <div style={{ ...S.pill, background: isOwner ? "rgba(234, 179, 8, 0.15)" : "rgba(59, 130, 246, 0.15)" }}>
              <span style={{ opacity: 0.8 }}>Contract Owner</span>
              <span style={{ fontWeight: 800, fontSize: 12 }}>
                {shortAddr(currentOwner)} {isOwner && "👑"}
              </span>
            </div>
          )}

          {networkInfo?.chainId !== 31337 && (
            <div style={{ color: "#FCA5A5", fontWeight: 700 }}>
              Wrong network. Switch MetaMask to Hardhat local (31337).
            </div>
          )}
        </div>
      )}
    </div>
  );
}
