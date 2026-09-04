import api from "./api.js";

export async function getSettings() {
  return api.get("/api/settings");
}

export async function getHealth() {
  return api.get("/health");
}

export default {
  getSettings,
  getHealth,
};
