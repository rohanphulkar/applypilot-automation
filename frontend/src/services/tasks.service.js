import api from "./api.js";

export async function getQueueTasks() {
  return api.get("/api/tasks");
}

export async function getTaskById(id) {
  return api.get(`/api/tasks/${id}`);
}

export default {
  getQueueTasks,
  getTaskById,
};
