import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  RotateCw,
  ArrowRight,
  Radio,
} from "lucide-react";
import { getQueueTasks } from "../services/tasks.service.js";
import { retryApplication } from "../services/applications.service.js";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton.jsx";
import { formatRelativeTime } from "../utils/formatters.js";

const TASK_TABS = [
  { id: "all", label: "All Tasks" },
  { id: "active", label: "Active", countKey: "active" },
  { id: "waiting", label: "Waiting / Queued", countKey: "waiting" },
  { id: "completed", label: "Completed", countKey: "completed" },
  { id: "failed", label: "Failed", countKey: "failed" },
];

export function TasksPage() {
  const [activeTab, setActiveTab] = useState("all");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["queueTasks"],
    queryFn: getQueueTasks,
    refetchInterval: 3000,
  });

  const retryMutation = useMutation({
    mutationFn: retryApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queueTasks"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });

  const taskData = data?.data || { counts: {}, tasks: {} };
  const counts = taskData.counts || {};
  const tasksByCategory = taskData.tasks || {};

  const getFilteredTasks = () => {
    if (activeTab === "all") {
      return [
        ...(tasksByCategory.active || []),
        ...(tasksByCategory.waiting || []),
        ...(tasksByCategory.failed || []),
        ...(tasksByCategory.completed || []),
      ];
    }
    return tasksByCategory[activeTab] || [];
  };

  const tasksList = getFilteredTasks();

  return (
    <div className="space-y-6 animate-in fade-in duration-200 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#3c3c3c] dark:text-white tracking-tight uppercase">
            Task Queue
          </h2>
          <p className="text-xs text-[#777777] dark:text-[#a5b6be] font-bold mt-0.5">
            Monitor real-time task executions, worker concurrency, and retry states
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="duo-card p-4">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#777777] dark:text-[#a5b6be] block mb-1">
            Waiting in Queue
          </span>
          <span className="text-2xl font-black text-[#1cb0f6] font-mono">
            {counts.waiting ?? 0}
          </span>
        </div>

        <div className="duo-card p-4">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#ce82ff] block mb-1">
            Active Processing
          </span>
          <span className="text-2xl font-black text-[#ce82ff] font-mono">
            {counts.active ?? 0}
          </span>
        </div>

        <div className="duo-card p-4">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#58a700] dark:text-[#a5ed6e] block mb-1">
            Completed Tasks
          </span>
          <span className="text-2xl font-black text-[#58cc02] font-mono">
            {counts.completed ?? 0}
          </span>
        </div>

        <div className="duo-card p-4">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#ff4b4b] block mb-1">
            Failed Retries
          </span>
          <span className="text-2xl font-black text-[#ff4b4b] font-mono">
            {counts.failed ?? 0}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b-2 border-[#e5e5e5] dark:border-[#2e414c] pb-px">
        {TASK_TABS.map((tab) => {
          const count = tab.countKey ? counts[tab.countKey] : counts.total;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border-b-4 cursor-pointer ${
                isActive
                  ? "border-[#58cc02] text-[#58a700] dark:text-[#a5ed6e] bg-white/50 dark:bg-[#1b2b32]/50 rounded-t-xl"
                  : "border-transparent text-[#777777] dark:text-[#a5b6be] hover:text-[#3c3c3c] dark:hover:text-white"
              }`}
            >
              <span>{tab.label}</span>
              {typeof count === "number" && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#f7f9fa] dark:bg-[#233a44] border border-[#e5e5e5] dark:border-[#2e414c] text-[#777777] dark:text-[#a5b6be] font-mono font-bold">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tasks Table */}
      {isLoading && !data ? (
        <LoadingSkeleton count={5} type="table" />
      ) : tasksList.length > 0 ? (
        <div className="duo-card p-4 overflow-x-auto">
          <table className="w-full min-w-160 text-left border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-[#e5e5e5] dark:border-[#2e414c] text-[11px] font-black uppercase tracking-wider text-[#777777] dark:text-[#a5b6be] bg-[#f7f9fa] dark:bg-[#233a44]">
                <th className="py-3.5 px-4 rounded-tl-xl">Task ID</th>
                <th className="py-3.5 px-4">Application</th>
                <th className="py-3.5 px-4">State</th>
                <th className="py-3.5 px-4">Attempts</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4 text-right rounded-tr-xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#e5e5e5] dark:divide-[#2e414c]">
              {tasksList.map((task) => (
                <tr
                  key={task.id}
                  className="hover:bg-[#ddf4ff]/40 dark:hover:bg-[#162a35]/60 transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono font-black text-[#3c3c3c] dark:text-white">
                    #{task.id}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <span className="font-black text-[#3c3c3c] dark:text-white">
                        {task.role}
                      </span>
                      <span className="text-[11px] text-[#777777] dark:text-[#a5b6be] font-mono">
                        {task.applicationId || "—"}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-black uppercase border-2 ${
                        task.state === "completed"
                          ? "bg-[#d7ffb8] dark:bg-[#1a3818] text-[#58a700] dark:text-[#a5ed6e] border-[#58cc02]"
                          : task.state === "failed"
                          ? "bg-[#ffe5e5] dark:bg-[#38181a] text-[#ea2b2b] dark:text-[#ff7a7a] border-[#ff4b4b]"
                          : task.state === "active"
                          ? "bg-[#ddf4ff] dark:bg-[#162a35] text-[#1899d6] dark:text-[#1cb0f6] border-[#1cb0f6]"
                          : "bg-[#f7f9fa] dark:bg-[#233a44] text-[#777777] dark:text-[#a5b6be] border-[#e5e5e5]"
                      }`}
                    >
                      {task.state}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-[#3c3c3c] dark:text-white">
                    {task.attemptsMade} attempt(s)
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#777777] dark:text-[#a5b6be] font-bold uppercase text-[11px]">
                    {formatRelativeTime(task.timestamp)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {task.state === "failed" && task.applicationId && (
                        <button
                          type="button"
                          onClick={() => retryMutation.mutate(task.applicationId)}
                          disabled={retryMutation.isPending}
                          className="duo-btn-danger px-2.5 py-1 text-xs font-black flex items-center gap-1"
                        >
                          <RotateCw size={12} className={retryMutation.isPending ? "animate-spin" : "stroke-[2.5]"} /> Retry
                        </button>
                      )}
                      {task.applicationId && (
                        <Link
                          to={`/applications/${task.applicationId}`}
                          className="duo-btn-accent px-3 py-1 text-xs font-black inline-flex items-center gap-1"
                        >
                          <span>VIEW</span> <ArrowRight size={12} className="stroke-[3]" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="duo-card p-12 text-center text-xs font-bold text-[#777777] dark:text-[#a5b6be]">
          No tasks found in this queue category.
        </div>
      )}
    </div>
  );
}

export default TasksPage;
