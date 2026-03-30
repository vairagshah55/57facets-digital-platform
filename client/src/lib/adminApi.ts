const API_BASE = "http://localhost:5000/api/admin";

function getAdminToken(): string | null {
  return localStorage.getItem("sf_admin_token");
}

export function setAdminToken(token: string) {
  localStorage.setItem("sf_admin_token", token);
}

export function clearAdminToken() {
  localStorage.removeItem("sf_admin_token");
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearAdminToken();
    window.location.href = "/admin/login";
    throw new Error("Session expired");
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

// ── Auth ──────────────────────────────────────────
export const adminAuth = {
  login: (email: string, password: string) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request("/auth/me"),
};

// ── Dashboard ─────────────────────────────────────
export const adminDashboard = {
  stats: () => request("/dashboard/stats"),
  quickAccess: () => request("/dashboard/quick-access"),
  activity: (limit = 20) => request(`/dashboard/activity?limit=${limit}`),
  ordersChart: () => request("/dashboard/charts/orders"),
  topProducts: () => request("/dashboard/charts/top-products"),
  topRetailers: () => request("/dashboard/charts/top-retailers"),
};
