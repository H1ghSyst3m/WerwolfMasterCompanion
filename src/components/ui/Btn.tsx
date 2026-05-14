interface BtnProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  cls?: string;
  size?: "lg" | "md" | "sm";
}

export function Btn({ children, onClick, cls = "", disabled = false, size = "md", type = "button", ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
        size === "lg" ? "px-6 py-4 text-lg" : size === "sm" ? "px-3 py-2 text-sm" : "px-4 py-3 text-base"
      } ${cls}`}
    >
      {children}
    </button>
  );
}
