interface LogoMarkProps {
  size?: number;
  className?: string;
  variant?: "default" | "plain";
}

export function LogoMark({
  size = 60,
  className = "",
  variant = "default",
}: LogoMarkProps) {
  const isPlain = variant === "plain";

  return (
    <div
      className={`flex items-center justify-center overflow-hidden shrink-0 ${
        isPlain ? "" : "rounded-2xl"
      } ${className}`}
      style={{
        width: size,
        height: size,
        ...(isPlain
          ? {}
          : {
              background:
                "linear-gradient(135deg, rgba(37,99,235,0.18) 0%, rgba(30,74,138,0.35) 100%)",
              border: "1px solid rgba(96,165,250,0.25)",
              boxShadow: "0 0 24px rgba(37,99,235,0.16)",
            }),
      }}
    >
      <img
        src="/logo.png"
        alt="Sankara College logo"
        className={`w-full h-full object-contain ${isPlain ? "" : "p-1.5"}`}
        draggable={false}
      />
    </div>
  );
}
