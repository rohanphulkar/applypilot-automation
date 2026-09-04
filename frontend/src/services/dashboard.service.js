import api from "./api.js";

export async function getDashboardStats() {
  return api.get("/api/dashboard");
}

export default {
  getDashboardStats,
};
