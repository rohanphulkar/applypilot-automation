import React from "react";
import { PlusCircle, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export function EmptyState({
  title = "No items found",
  description = "Get started by creating your first entry.",
  actionText = "Create New",
  actionHref = "/applications/new",
  icon: Icon = Sparkles,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center select-none">
      <div className="w-16 h-16 rounded-2xl bg-[#ddf4ff] dark:bg-[#162a35] border-2 border-[#1cb0f6] border-b-4 border-b-[#1899d6] text-[#1cb0f6] flex items-center justify-center mb-4">
        <Icon size={28} className="stroke-[2.5]" />
      </div>
      <h3 className="text-base font-black text-[#3c3c3c] dark:text-white">
        {title}
      </h3>
      <p className="text-xs text-[#777777] dark:text-[#a5b6be] max-w-sm mt-1.5 leading-relaxed font-bold">
        {description}
      </p>

      {actionText && actionHref && (
        <Link
          to={actionHref}
          className="mt-6 duo-btn-primary px-5 py-2.5 text-xs font-black tracking-wider flex items-center gap-2"
        >
          <PlusCircle size={16} className="stroke-[2.5]" />
          <span>{actionText}</span>
        </Link>
      )}
    </div>
  );
}

export default EmptyState;
