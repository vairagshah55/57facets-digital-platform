const API_BASE = `${import.meta.env.VITE_API_URL ?? "http://localhost:5000/api"}/admin`;

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
  notifications: () => request("/dashboard/notifications"),
  markNotificationRead: (id: string) => request(`/dashboard/notifications/${id}/read`, { method: "PUT" }),
  markAllNotificationsRead: () => request("/dashboard/notifications/read-all", { method: "PUT" }),
};

// ── Retailers ─────────────────────────────────────
export const adminRetailers = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/retailers${qs}`);
  },
  detail: (id: string) => request(`/retailers/${id}`),
  create: (data: any) =>
    request("/retailers", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request(`/retailers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  activate: (id: string) =>
    request(`/retailers/${id}/activate`, { method: "PUT" }),
  deactivate: (id: string) =>
    request(`/retailers/${id}/deactivate`, { method: "PUT" }),
  forceLogout: (id: string) =>
    request(`/retailers/${id}/force-logout`, { method: "POST" }),
  notify: (id: string, title: string, message: string, type = "announcement") =>
    request(`/retailers/${id}/notify`, { method: "POST", body: JSON.stringify({ title, message, type }) }),
  notifyBulk: (retailerIds: string[], title: string, message: string, type = "announcement") =>
    request("/retailers/notify-bulk", { method: "POST", body: JSON.stringify({ retailerIds, title, message, type }) }),
  importCsv: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const token = getAdminToken();
    const res = await fetch(`${API_BASE}/retailers/import-csv`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Import failed");
    return data;
  },
};

// ── Products (Admin) ──────────────────────────────
export const adminProducts = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/products${qs}`);
  },
  detail: (id: string) => request(`/products/${id}`),
  create: (data: any) =>
    request("/products", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/products/${id}`, { method: "DELETE" }),
  categories: () => request("/products/meta/categories"),
  collections: () => request("/products/meta/collections"),
  uploadImages: async (productId: string, files: FileList | File[]) => {
    const formData = new FormData();
    for (const file of Array.from(files)) formData.append("images", file);
    const token = getAdminToken();
    const res = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:5000/api"}/upload/product-images/${productId}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data;
  },
  setPrimaryImage: (imageId: string) =>
    request(`/upload/product-images/${imageId}/primary`, { method: "PUT" }),
  deleteImage: (imageId: string) =>
    request(`/upload/product-images/${imageId}`, { method: "DELETE" }),
  importCsv: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const token = getAdminToken();
    const res = await fetch(`${API_BASE}/products/import-csv`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Import failed");
    return data;
  },
};

// ── Orders (Admin) ───────────────────────────────
export const adminOrders = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/orders${qs}`);
  },
  detail: (id: string) => request(`/orders/${id}`),
  updateStatus: (id: string, status: string, detail?: string) =>
    request(`/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, detail }),
    }),
};
