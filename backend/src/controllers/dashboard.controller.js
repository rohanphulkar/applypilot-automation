import Job from "../models/job.model.js";

/**
 * GET /api/dashboard
 * Aggregates user-scoped metrics, status distribution, and activity feeds for the dashboard.
 */
export async function getDashboardStats(req, res, next) {
  try {
    const userId = req.auth?.userId;
    const baseFilter = {};
    if (userId && !req.auth?.isDemo) {
      baseFilter.userId = userId;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Run parallel aggregation queries
    const [
      totalApplications,
      queuedCount,
      processingCount,
      readyForReviewCount,
      completedCount,
      failedCount,
      emailsSentCount,
      todayCount,
      thisWeekCount,
      recentApplications,
      activeJobs,
      reviewJobs,
    ] = await Promise.all([
      Job.countDocuments(baseFilter),
      Job.countDocuments({ ...baseFilter, status: "QUEUED" }),
      Job.countDocuments({
        ...baseFilter,
        status: {
          $in: [
            "PROCESSING",
            "PARSING_JOB",
            "TAILORING_RESUME",
            "GENERATING_COVER_LETTER",
            "COMPOSING_EMAIL",
            "SENDING_EMAIL",
            "SAVING_TO_SENT",
          ],
        },
      }),
      Job.countDocuments({
        ...baseFilter,
        status: { $in: ["READY_FOR_REVIEW", "AWAITING_APPROVAL"] },
      }),
      Job.countDocuments({ ...baseFilter, status: "COMPLETED" }),
      Job.countDocuments({ ...baseFilter, status: "FAILED" }),
      Job.countDocuments({ ...baseFilter, "email.smtpStatus": "SENT" }),
      Job.countDocuments({ ...baseFilter, createdAt: { $gte: startOfToday } }),
      Job.countDocuments({ ...baseFilter, createdAt: { $gte: sevenDaysAgo } }),
      Job.find(baseFilter).sort({ createdAt: -1 }).limit(6).lean(),
      Job.find({
        ...baseFilter,
        status: {
          $in: [
            "PROCESSING",
            "PARSING_JOB",
            "TAILORING_RESUME",
            "GENERATING_COVER_LETTER",
            "COMPOSING_EMAIL",
            "SENDING_EMAIL",
            "SAVING_TO_SENT",
          ],
        },
      })
        .sort({ updatedAt: -1 })
        .limit(4)
        .lean(),
      Job.find({
        ...baseFilter,
        status: { $in: ["READY_FOR_REVIEW", "AWAITING_APPROVAL"] },
      })
        .sort({ updatedAt: -1 })
        .limit(4)
        .lean(),
    ]);

    const completionRate =
      totalApplications > 0
        ? Math.round((completedCount / totalApplications) * 100)
        : 0;

    const failureRate =
      totalApplications > 0
        ? Math.round((failedCount / totalApplications) * 100)
        : 0;

    const statusDistribution = [
      { name: "Completed", count: completedCount, color: "#10b981" },
      { name: "Ready for Review", count: readyForReviewCount, color: "#f59e0b" },
      { name: "In Progress", count: processingCount, color: "#8b5cf6" },
      { name: "Queued", count: queuedCount, color: "#3b82f6" },
      { name: "Failed", count: failedCount, color: "#ef4444" },
    ];

    // Collect latest timeline events across recent jobs
    const timelineEvents = [];
    const jobsWithTimeline = await Job.find({ ...baseFilter, "timeline.0": { $exists: true } })
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

    for (const j of jobsWithTimeline) {
      if (Array.isArray(j.timeline)) {
        for (const ev of j.timeline.slice(-3)) {
          timelineEvents.push({
            applicationId: j.jobId,
            role: j.parsedJob?.title || "Role Application",
            company: j.parsedJob?.company || "Company",
            stage: ev.stage,
            status: ev.status,
            message: ev.message,
            createdAt: ev.createdAt,
          });
        }
      }
    }

    // Sort timeline newest first
    timelineEvents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true,
      data: {
        totalApplications,
        queued: queuedCount,
        processing: processingCount,
        readyForReview: readyForReviewCount,
        completed: completedCount,
        failed: failedCount,
        emailsSent: emailsSentCount,
        applicationsToday: todayCount,
        applicationsThisWeek: thisWeekCount,
        completionRate,
        failureRate,
        recentApplications,
        activeJobs,
        reviewJobs,
        statusDistribution,
        recentTimeline: timelineEvents.slice(0, 8),
      },
    });
  } catch (error) {
    next(error);
  }
}

export default {
  getDashboardStats,
};
