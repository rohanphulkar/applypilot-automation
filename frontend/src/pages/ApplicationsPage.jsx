import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  LayoutList,
  LayoutGrid,
  ArrowUpDown,
  PlusCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  getApplications,
  retryApplication,
  deleteApplication,
} from "../services/applications.service.js";
import { useUIStore } from "../store/uiStore.js";
import { ApplicationTable } from "../components/applications/ApplicationTable.jsx";
import { ApplicationGrid } from "../components/applications/ApplicationGrid.jsx";
import { ConfirmDialog } from "../components/common/ConfirmDialog.jsx";
import { EmptyState } from "../components/common/EmptyState.jsx";
import { LoadingSkeleton } from "../components/common/LoadingSkeleton.jsx";

const STATUS_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "READY_FOR_REVIEW", label: "Awaiting Review" },
  { id: "PROCESSING", label: "Processing" },
  { id: "QUEUED", label: "Queued" },
  { id: "COMPLETED", label: "Completed" },
  { id: "FAILED", label: "Failed" },
];

export function ApplicationsPage() {
  const { viewMode, setViewMode, statusFilter, setStatusFilter, searchQuery, setSearchQuery } = useUIStore();
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("newest");
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["applications", { page, status: statusFilter, search: searchQuery, sort: sortBy }],
    queryFn: () =>
      getApplications({
        page,
        limit: 15,
        status: statusFilter,
        search: searchQuery,
        sort: sortBy,
      }),
    refetchInterval: 3000,
  });

  const retryMutation = useMutation({
    mutationFn: retryApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteApplication,
    onSuccess: () => {
      setDeleteTargetId(null);
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
  });

  const applications = data?.data || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: 15, pages: 1 };

  const handleRetry = (id) => {
    retryMutation.mutate(id);
  };

  const handleDeleteConfirm = () => {
    if (deleteTargetId) {
      deleteMutation.mutate(deleteTargetId);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 select-none">
      {/* Top Controls & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#3c3c3c] dark:text-white tracking-tight uppercase">
            Job Applications
          </h2>
          <p className="text-xs text-[#777777] dark:text-[#a5b6be] font-bold mt-0.5">
            Manage, review, and control all automated job applications ({pagination.total} total)
          </p>
        </div>

        <Link
          to="/applications/new"
          className="duo-btn-primary px-4 py-2.5 text-xs font-black tracking-wider flex items-center gap-2 self-start md:self-auto"
        >
          <PlusCircle size={16} className="stroke-[3]" />
          <span>NEW APPLICATION</span>
        </Link>
      </div>

      {/* Filter Toolbar Card */}
      <div className="duo-card p-3.5 sm:p-4 space-y-3 sm:space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-full md:max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#afafaf] stroke-[2.5]" />
            <input
              type="text"
              placeholder="Search by role, company, skills, or ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-[#f7f9fa] dark:bg-[#233a44] border-2 border-[#e5e5e5] dark:border-[#2e414c] text-xs font-bold text-[#3c3c3c] dark:text-white placeholder:text-[#afafaf] focus:outline-hidden focus:border-[#1cb0f6] transition-colors"
            />
          </div>

          {/* Right Filters & View Switch */}
          <div className="flex items-center gap-2 sm:gap-2.5 justify-between sm:justify-end">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs font-black text-[#777777] dark:text-[#a5b6be]">
              <ArrowUpDown size={14} className="stroke-[2.5] shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#f7f9fa] dark:bg-[#233a44] border-2 border-[#e5e5e5] dark:border-[#2e414c] rounded-xl px-2.5 py-1.5 text-xs font-black text-[#3c3c3c] dark:text-white focus:outline-hidden focus:border-[#1cb0f6]"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="company">Company (A-Z)</option>
                <option value="role">Role (A-Z)</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-[#f7f9fa] dark:bg-[#233a44] border-2 border-[#e5e5e5] dark:border-[#2e414c] rounded-2xl shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-[#1cb0f6] text-white shadow-xs"
                    : "text-[#777777] dark:text-[#a5b6be] hover:text-[#3c3c3c] dark:hover:text-white"
                }`}
                title="Table View"
              >
                <LayoutList size={16} className="stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === "cards"
                    ? "bg-[#1cb0f6] text-white shadow-xs"
                    : "text-[#777777] dark:text-[#a5b6be] hover:text-[#3c3c3c] dark:hover:text-white"
                }`}
                title="Grid / Cards View"
              >
                <LayoutGrid size={16} className="stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 border-t-2 border-[#e5e5e5] dark:border-[#2e414c] pt-3 -mx-1 px-1">
          <span className="text-[10px] font-black text-[#777777] dark:text-[#a5b6be] uppercase tracking-wider mr-1 shrink-0">
            FILTER:
          </span>
          {STATUS_FILTERS.map((filter) => {
            const isSelected = statusFilter === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => {
                  setStatusFilter(filter.id);
                  setPage(1);
                }}
                className={`px-3 sm:px-3.5 py-1 rounded-full text-xs font-black uppercase whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#58cc02] text-white border-2 border-[#46a302] shadow-xs"
                    : "bg-[#f7f9fa] dark:bg-[#233a44] text-[#777777] dark:text-[#a5b6be] hover:bg-[#e5e5e5] dark:hover:bg-[#2e414c] border-2 border-transparent"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading && !data ? (
        <LoadingSkeleton count={viewMode === "table" ? 6 : 6} type={viewMode === "table" ? "table" : "card"} />
      ) : applications.length > 0 ? (
        <div className="space-y-6">
          {viewMode === "table" ? (
            <div className="duo-card p-4">
              <ApplicationTable
                applications={applications}
                onRetry={handleRetry}
                onDelete={(id) => setDeleteTargetId(id)}
                isRetrying={retryMutation.isPending}
              />
            </div>
          ) : (
            <ApplicationGrid
              applications={applications}
              onRetry={handleRetry}
              onDelete={(id) => setDeleteTargetId(id)}
              isRetrying={retryMutation.isPending}
            />
          )}

          {/* 3D Pagination Controls */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-2 py-3">
              <span className="text-xs text-[#777777] dark:text-[#a5b6be] font-bold font-mono uppercase">
                Page {pagination.page} of {pagination.pages}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="duo-btn-secondary px-4 py-1.5 text-xs font-black disabled:opacity-40"
                >
                  PREVIOUS
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={pagination.page >= pagination.pages}
                  className="duo-btn-secondary px-4 py-1.5 text-xs font-black disabled:opacity-40"
                >
                  NEXT
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="duo-card">
          <EmptyState
            title="No applications match your filter"
            description="Try changing your search terms, clearing status filters, or creating a new application."
            actionText="Start New Application"
            actionHref="/applications/new"
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        title="Delete Application Record?"
        message="This will remove the application history and logs from MongoDB. Emails already sent to recruiters will not be affected."
        confirmText="Delete Application"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}

export default ApplicationsPage;
