import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const http = axios.create({
  baseURL: API,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

export const api = {
  health: () => http.get("/health").then((r) => r.data),
  seed: () => http.post("/seed").then((r) => r.data),

  chat: (payload) => http.post("/chat", payload).then((r) => r.data),
  recentRequests: (limit = 10) =>
    http.get(`/requests?limit=${limit}`).then((r) => r.data),

  memoryStore: (payload) => http.post("/memory/store", payload).then((r) => r.data),
  memorySearch: (payload) => http.post("/memory/search", payload).then((r) => r.data),
  memoryList: (type, limit = 50) =>
    http
      .get(`/memory/list?${type ? `type=${type}&` : ""}limit=${limit}`)
      .then((r) => r.data),

  employees: () => http.get("/mentor/employees").then((r) => r.data),
  employeeSummary: (id) =>
    http.get(`/mentor/employees/${id}`).then((r) => r.data),
  patterns: () => http.get("/mentor/patterns").then((r) => r.data),
  detectPatterns: (id) => http.post(`/mentor/detect/${id}`).then((r) => r.data),

  roiDashboard: () => http.get("/roi/dashboard").then((r) => r.data),
  roiCurrent: () => http.get("/roi/current").then((r) => r.data),
  roiTrend: (hours = 24) =>
    http.get(`/roi/trend?hours=${hours}`).then((r) => r.data),

  alerts: (limit = 20) => http.get(`/alerts?limit=${limit}`).then((r) => r.data),

  voiceConverse: (blob, opts = {}) => {
    const fd = new FormData();
    const filename = opts.filename || "speech.webm";
    fd.append("file", blob, filename);
    if (opts.session_id) fd.append("session_id", opts.session_id);
    if (opts.user_id) fd.append("user_id", opts.user_id);
    if (opts.language) fd.append("language", opts.language);
    if (opts.voice) fd.append("voice", opts.voice);
    return http
      .post("/voice/converse", fd, {
        headers: { "Content-Type": undefined },
        timeout: 60000,
      })
      .then((r) => r.data);
  },

  voiceStt: (blob, opts = {}) => {
    const fd = new FormData();
    fd.append("file", blob, opts.filename || "speech.webm");
    if (opts.language) fd.append("language", opts.language);
    return http
      .post("/voice/stt", fd, {
        headers: { "Content-Type": undefined },
        timeout: 60000,
      })
      .then((r) => r.data);
  },
};

export default api;
