const BASE_URL = "https://donorabackend.onrender.com/api";

// ─── TOKEN HELPERS ────────────────────────────────────────────────────────────
export const getToken = () => localStorage.getItem("accessToken");
export const setTokens = (access, refresh) => {
  localStorage.setItem("accessToken", access);
  localStorage.setItem("refreshToken", refresh);
};
export const clearTokens = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
};

// ─── BASE FETCH WRAPPER ───────────────────────────────────────────────────────
const apiFetch = async (endpoint, options = {}, isRetry = false) => {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  // Auto-refresh on 401/403
  if ((res.status === 401 || res.status === 403) && !isRetry) {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) throw new Error("No refresh token");

      const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        credentials: "include",
      });

      if (!refreshRes.ok) throw new Error("Refresh failed");

      const { accessToken } = await refreshRes.json();
      setTokens(accessToken, refreshToken);

      return apiFetch(endpoint, options, true);
    } catch {
      clearTokens();
      window.location.href = "/login";
      throw new Error("Session expired. Please log in again.");
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) =>
    apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (payload) =>
    apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  logout: () => apiFetch("/auth/logout", { method: "POST" }),

  forgotPassword: (email) =>
    apiFetch("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  verifyOTP: (email, otp) =>
    apiFetch("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    }),

  resetPassword: (email, otp, newPassword) =>
    apiFetch("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, otp, newPassword }),
    }),

  deleteAccount: () => apiFetch("/auth/delete", { method: "DELETE" }),
};

// ─── BLOOD BANK ───────────────────────────────────────────────────────────────
export const bloodBankAPI = {
  getStock: () => apiFetch("/bloodbank/stock"),

  updateStock: (bloodType, units) =>
    apiFetch("/bloodbank/stock", {
      method: "POST",
      body: JSON.stringify({ bloodType, units }),
    }),

  fulfillRequest: (requestId) =>
    apiFetch(`/bloodbank/fulfill/${requestId}`, { method: "POST" }),

  acceptRequest: (requestId) =>
    apiFetch(`/bloodbank/accept/${requestId}`, { method: "POST" }),

  getMyBloodBank: () => apiFetch("/bloodbank/me"),

  updateMyBloodBank: (updates) =>
    apiFetch("/bloodbank/me", {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),

  // Nearby blood banks (basic, public — no auth needed for patient app)
  getNearby: (lng, lat, radius = 10) =>
    apiFetch(`/bloodbank/nearby?lng=${lng}&lat=${lat}&radius=${radius}`),

  // Nearby blood banks WITH their stock levels (authenticated, excludes self)
  // Used by the "Nearby Facilities" page
  getNearbyWithStock: (lng, lat, radius = 20) =>
    apiFetch(
      `/bloodbank/nearby-with-stock?lng=${lng}&lat=${lat}&radius=${radius}`,
    ),

  // Get a specific blood bank's stock inventory
  getBankStock: (bankId) => apiFetch(`/bloodbank/${bankId}/stock`),
};

// ─── REQUESTS ─────────────────────────────────────────────────────────────────
export const requestAPI = {
  // Blood bank or patient: get nearby pending requests (excludes own requests for bloodbank)
  getNearby: (lng, lat, radius = 10) =>
    apiFetch(`/requests/nearby?lng=${lng}&lat=${lat}&radius=${radius}`),

  // Get my own submitted requests (patient OR bloodbank) for tracking
  getMyRequests: () => apiFetch("/requests/mine"),

  // Create a blood request — allowed for patient and bloodbank roles
  createRequest: (payload) =>
    apiFetch("/requests", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Cancel a request I submitted
  cancelRequest: (requestId) =>
    apiFetch(`/requests/cancel/${requestId}`, { method: "PATCH" }),

  // Public: all pending requests in a wider area (for nearby facilities feature)
  getPublicRequests: (lng, lat, radius = 50) =>
    apiFetch(`/requests/public?lng=${lng}&lat=${lat}&radius=${radius}`),
};

// ─── MATCHES ──────────────────────────────────────────────────────────────────
export const matchAPI = {
  getMyMatches: () => apiFetch("/match/my"),
  cancelMatch: (matchId) =>
    apiFetch(`/match/cancel/${matchId}`, { method: "PATCH" }),
  findMatchWithUser: (userId) => apiFetch(`/match/find-with/${userId}`),
};

// ─── CHAT ─────────────────────────────────────────────────────────────────────
export const chatAPI = {
  // Match-based chat (existing)
  getMessages: (matchId) => apiFetch(`/chat/${matchId}`),
  sendMessage: (matchId, message) =>
    apiFetch("/chat", {
      method: "POST",
      body: JSON.stringify({ matchId, message }),
    }),

  // Direct threads — used when the mobile app messages the blood bank
  getMyDirectThreads: () => apiFetch("/chat/direct/my-threads"),
  getDirectThreadMessages: (threadId) =>
    apiFetch(`/chat/direct/${threadId}/messages`),
  sendDirectMessage: (threadId, message) =>
    apiFetch(`/chat/direct/${threadId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  // Start a direct conversation with another blood bank / donor by userId
  startDirectThread: (recipientId) =>
    apiFetch("/chat/direct/start", {
      method: "POST",
      body: JSON.stringify({ recipientId }),
    }),
};

// ─── USER ─────────────────────────────────────────────────────────────────────
export const userAPI = {
  getMyProfile: () => apiFetch("/users/me"),
  getUserProfile: (userId) => apiFetch(`/users/${userId}`),
  updateProfile: (updates) =>
    apiFetch("/users/me", {
      method: "PATCH",
      body: JSON.stringify(updates),
    }),
  updateLocation: (lng, lat) =>
    apiFetch("/users/location", {
      method: "PATCH",
      body: JSON.stringify({ lng, lat }),
    }),
};

// ─── DONORS ───────────────────────────────────────────────────────────────────
export const donorAPI = {
  getNearbyDonors: (lng, lat, radius = 10) =>
    apiFetch(`/donors/nearby?lng=${lng}&lat=${lat}&radius=${radius}`),
  getDonorProfile: (userId) => apiFetch(`/donors/${userId}`),
};

// ─── SOS ──────────────────────────────────────────────────────────────────────
export const sosAPI = {
  acceptSOS: (sosId) =>
    apiFetch("/sos/accept", {
      method: "POST",
      body: JSON.stringify({ sosId }),
    }),
};
