
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json"
  }
});

export const getDashboard = () => api.get("/dashboard");
export const getEmployees = (page = 1, limit = 10) =>
  api.get(`/employees?page=${page}&limit=${limit}`);

export const getPriorities = () =>
  api.get("/retention/priorities");

export const getDataQuality = () =>
  api.get("/data-quality");

export const createIntervention = (data) =>
  api.post("/interventions", data);

export default api;
