import { S } from "../../styles/theme";

export function Button({ variant = "primary", children, disabled, onClick, style, ...props }) {
  const baseStyle = variant === "primary" ? S.btnPrimary : S.btnSecondary;
  const finalStyle = {
    ...baseStyle,
    ...(disabled ? S.btnDisabled : {}),
    ...style,
  };

  return (
    <button
      style={finalStyle}
      onClick={onClick}
      disabled={disabled}
      onMouseDown={(e) => !disabled && (e.currentTarget.style.transform = "scale(0.98)")}
      onMouseUp={(e) => !disabled && (e.currentTarget.style.transform = "scale(1)")}
      {...props}
    >
      {children}
    </button>
  );
}
