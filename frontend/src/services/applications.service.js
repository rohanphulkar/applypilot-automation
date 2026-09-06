import api from "./api.js";

/**
 * Service to manage job applications
 */
export async function createApplication(payload) {
  const body = typeof payload === "string" ? { job_description: payload } : payload;
  return api.post("/api/jobs", body);
}

export async function parseJobImage(imageBase64, mimeType = "image/png") {
  return api.post("/api/jobs/parse-image", { image: imageBase64, mimeType });
}

export async function getApplications(params = {}) {
  return api.get("/api/jobs", { params });
}

export async function getApplicationById(id) {
  return api.get(`/api/jobs/${id}`);
}

export async function updateApplication(id, data) {
  return api.patch(`/api/jobs/${id}`, data);
}

export async function sendApplicationEmail(id, overrides = {}) {
  return api.post(`/api/jobs/${id}/send`, overrides);
}

export async function retryApplication(id) {
  return api.post(`/api/jobs/${id}/retry`);
}

export async function deleteApplication(id) {
  return api.delete(`/api/jobs/${id}`);
}

export default {
  createApplication,
  parseJobImage,
  getApplications,
  getApplicationById,
  updateApplication,
  sendApplicationEmail,
  retryApplication,
  deleteApplication,
};
