interface AmbientOrbsProps {
  variant?: "blue" | "teal" | "mixed";
}

export function AmbientOrbs({ variant = "mixed" }: AmbientOrbsProps) {
  const orbs = [
    {
      color: variant === "teal" ? "rgba(54,192,199,0.09)" : "rgba(46,109,164,0.10)",
      width: "600px",
      height: "500px",
      top: "-10%",
      left: "-15%",
      animation: "ambient-float 18s ease-in-out infinite",
    },
    {
      color: variant === "blue" ? "rgba(46,109,164,0.08)" : "rgba(54,192,199,0.07)",
      width: "500px",
      height: "400px",
      top: "40%",
      right: "-10%",
      animation: "ambient-float-2 22s ease-in-out infinite",
    },
    {
      color: "rgba(63,139,195,0.06)",
      width: "350px",
      height: "350px",
      bottom: "5%",
      left: "30%",
      animation: "ambient-float 26s ease-in-out 4s infinite",
    },
  ];

  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}
    >
      {orbs.map((orb, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: orb.width,
            height: orb.height,
            top: orb.top,
            left: (orb as any).left,
            right: (orb as any).right,
            bottom: (orb as any).bottom,
            borderRadius: "50%",
            background: `radial-gradient(ellipse, ${orb.color} 0%, transparent 70%)`,
            animation: orb.animation,
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}
