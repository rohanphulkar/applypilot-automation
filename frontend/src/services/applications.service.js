import api from "./api.js";

/**
 * Service to manage job applications
 */
export async function createApplication(jobDescription) {
  return api.post("/api/jobs", { job_description: jobDescription });
}

export async function getApplications(params = {}) {
  return api.get("/api/jobs", { params });
}

export async function getApplicationById(id) {
  return api.get(`/api/jobs/${id}`);
}

export async function retryApplication(id) {
  return api.post(`/api/jobs/${id}/retry`);
}

export async function deleteApplication(id) {
  return api.delete(`/api/jobs/${id}`);
}

export default {
  createApplication,
  getApplications,
  getApplicationById,
  retryApplication,
  deleteApplication,
};
