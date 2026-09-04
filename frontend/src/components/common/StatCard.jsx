import React from "react";

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = "green", // "green", "cyan", "orange", "rose", "purple"
  onClick,
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case "green":
        return {
          iconBg: "bg-[#d7ffb8] dark:bg-[#1a3818] text-[#58a700] dark:text-[#a5ed6e] border-2 border-[#58cc02]",
          hoverBorder: "hover:border-[#58cc02]",
        };
      case "cyan":
      case "blue":
        return {
          iconBg: "bg-[#ddf4ff] dark:bg-[#162a35] text-[#1899d6] dark:text-[#1cb0f6] border-2 border-[#1cb0f6]",
          hoverBorder: "hover:border-[#1cb0f6]",
        };
      case "orange":
        return {
          iconBg: "bg-[#ffe8cc] dark:bg-[#382512] text-[#e58600] dark:text-[#ff9600] border-2 border-[#ff9600]",
          hoverBorder: "hover:border-[#ff9600]",
        };
      case "rose":
      case "red":
        return {
          iconBg: "bg-[#ffe5e5] dark:bg-[#38181a] text-[#ea2b2b] dark:text-[#ff4b4b] border-2 border-[#ff4b4b]",
          hoverBorder: "hover:border-[#ff4b4b]",
        };
      default:
        return {
          iconBg: "bg-[#f3e8ff] dark:bg-[#2c1838] text-[#9333ea] dark:text-[#ce82ff] border-2 border-[#ce82ff]",
          hoverBorder: "hover:border-[#ce82ff]",
        };
    }
  };

  const { iconBg, hoverBorder } = getVariantStyles();

  return (
    <div
      onClick={onClick}
      className={`duo-card p-5 select-none transition-all duration-150 ${hoverBorder} ${
        onClick ? "cursor-pointer active:border-b-2 active:translate-y-[2px]" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-black uppercase tracking-wider text-[#777777] dark:text-[#a5b6be]">
          {title}
        </span>
        {Icon && (
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${iconBg}`}>
            <Icon size={20} className="stroke-[2.5]" />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl md:text-4xl font-black tracking-tight text-[#3c3c3c] dark:text-white">
          {typeof value === "number" ? value.toLocaleString() : value ?? 0}
        </span>
      </div>
      {subtitle && (
        <p className="mt-1.5 text-xs text-[#777777] dark:text-[#a5b6be] font-bold">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default StatCard;
