import { S } from "../../styles/theme";

export function TxStatus({ status }) {
  if (!status) return null;
  
  return <div style={S.status}>{status}</div>;
}
