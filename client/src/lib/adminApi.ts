const API_BASE = (import.meta.env.VITE_API_URL || "https://facets-backend-608725052152.us-central1.run.app") + "/api/admin";

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

  if (res.status === 401 && !endpoint.startsWith("/auth/")) {
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
  // Retailer-shaped detail (price for a given retailer, or base when none) — for admin "view as retailer".
  preview: (id: string, retailerId?: string) =>
    request(`/products/${id}/preview${retailerId ? `?retailerId=${retailerId}` : ""}`),
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
    const res = await fetch(`${import.meta.env.VITE_API_URL || "https://facets-backend-608725052152.us-central1.run.app"}/api/upload/product-images/${productId}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data;
  },
  listImages: async (productId: string) => {
    const token = getAdminToken();
    const base = import.meta.env.VITE_API_URL || "https://facets-backend-608725052152.us-central1.run.app";
    const res = await fetch(`${base}/api/upload/product-images/${productId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load images");
    return data as { id: string; image_url: string; is_primary: boolean; sort_order: number; media_type: string }[];
  },
  setPrimaryImage: async (imageId: string) => {
    const token = getAdminToken();
    const base = import.meta.env.VITE_API_URL || "https://facets-backend-608725052152.us-central1.run.app";
    const res = await fetch(`${base}/api/upload/product-images/${imageId}/primary`, {
      method: "PUT",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to set primary");
    return data;
  },
  deleteImage: async (imageId: string) => {
    const token = getAdminToken();
    const base = import.meta.env.VITE_API_URL || "https://facets-backend-608725052152.us-central1.run.app";
    const res = await fetch(`${base}/api/upload/product-images/${imageId}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to delete image");
    return data;
  },
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

// ── Collections (Admin) ───────────────────────────
export const adminCollections = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/collections${qs}`);
  },
  detail: (id: string) => request(`/collections/${id}`),
  create: (data: any) =>
    request("/collections", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request(`/collections/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request(`/collections/${id}`, { method: "DELETE" }),
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
  allowEdit: (id: string, note?: string) =>
    request(`/orders/${id}/allow-edit`, {
      method: "PUT",
      body: JSON.stringify({ note }),
    }),
  revokeEdit: (id: string) =>
    request(`/orders/${id}/allow-edit`, { method: "DELETE" }),
  getEditLogs: (id: string) =>
    request(`/orders/${id}/edit-logs`),
};

// ── Pricing (Admin) ───────────────────────────────
export const adminPricing = {
  // ── Rate chart — every read/write is scoped: pass a retailerId to edit that
  // retailer's own chart, or omit it (scope = "") to edit the Global default. ──
  // Diamond rate matrix
  diamondRates: (retailerId?: string) =>
    request(`/pricing/diamond-rates${retailerId ? `?retailerId=${retailerId}` : ""}`),
  saveDiamondRates: (rows: any[], retailerId?: string) =>
    request(`/pricing/diamond-rates${retailerId ? `?retailerId=${retailerId}` : ""}`, { method: "PUT", body: JSON.stringify(rows) }),
  deleteDiamondRate: (id: string) => request(`/pricing/diamond-rates/${id}`, { method: "DELETE" }),
  // Delete a whole sieve row (shape_group + sieve) — Global, or a retailer's chart.
  deleteDiamondSieveRow: (shapeGroup: string, sieve: string, retailerId?: string) =>
    request(`/pricing/diamond-rates?shapeGroup=${encodeURIComponent(shapeGroup)}&sieve=${encodeURIComponent(sieve)}${retailerId ? `&retailerId=${retailerId}` : ""}`, { method: "DELETE" }),

  // Carat → sieve map
  sieveMap: (retailerId?: string) =>
    request(`/pricing/sieve-map${retailerId ? `?retailerId=${retailerId}` : ""}`),
  saveSieveMap: (rows: any[], retailerId?: string) =>
    request(`/pricing/sieve-map${retailerId ? `?retailerId=${retailerId}` : ""}`, { method: "PUT", body: JSON.stringify(rows) }),
  deleteSieve: (id: string) => request(`/pricing/sieve-map/${id}`, { method: "DELETE" }),

  // Diamond sieves — the plain list of sieve rows shown in the matrix.
  diamondSieves: () => request(`/pricing/diamond-sieves`),
  addDiamondSieve: (shapeGroup: string, sieve: string) =>
    request(`/pricing/diamond-sieves`, { method: "POST", body: JSON.stringify({ shape_group: shapeGroup, sieve_size: sieve }) }),
  removeDiamondSieve: (shapeGroup: string, sieve: string) =>
    request(`/pricing/diamond-sieves?shapeGroup=${encodeURIComponent(shapeGroup)}&sieve=${encodeURIComponent(sieve)}`, { method: "DELETE" }),

  // Stone rates
  stoneRates: (retailerId?: string) =>
    request(`/pricing/stone-rates${retailerId ? `?retailerId=${retailerId}` : ""}`),
  saveStoneRates: (rows: any[], retailerId?: string) =>
    request(`/pricing/stone-rates${retailerId ? `?retailerId=${retailerId}` : ""}`, { method: "PUT", body: JSON.stringify(rows) }),
  deleteStoneRate: (id: string) => request(`/pricing/stone-rates/${id}`, { method: "DELETE" }),

  // Metal (gold) rates
  metalRates: (retailerId?: string) =>
    request(`/pricing/metal-rates${retailerId ? `?retailerId=${retailerId}` : ""}`),
  saveMetalRates: (rows: any[], retailerId?: string) =>
    request(`/pricing/metal-rates${retailerId ? `?retailerId=${retailerId}` : ""}`, { method: "PUT", body: JSON.stringify(rows) }),
  syncGold: () => request("/pricing/metal-rates/sync", { method: "POST" }),

  // Making charges
  makingCharges: (retailerId?: string) =>
    request(`/pricing/making-charges${retailerId ? `?retailerId=${retailerId}` : ""}`),
  saveMakingCharges: (rows: any[], retailerId?: string) =>
    request(`/pricing/making-charges${retailerId ? `?retailerId=${retailerId}` : ""}`, { method: "PUT", body: JSON.stringify(rows) }),
  deleteMaking: (id: string) => request(`/pricing/making-charges/${id}`, { method: "DELETE" }),

  // Retailer pricing — factors + per-product overrides
  retailers: () => request("/pricing/retailers"),
  saveFactors: (id: string, body: any) =>
    request(`/pricing/retailers/${id}/factors`, { method: "PUT", body: JSON.stringify(body) }),
  overrides: (id: string) => request(`/pricing/retailers/${id}/overrides`),
  saveOverride: (id: string, product_id: string, price: number) =>
    request(`/pricing/retailers/${id}/overrides`, { method: "PUT", body: JSON.stringify({ product_id, price }) }),
  deleteOverride: (id: string, productId: string) =>
    request(`/pricing/retailers/${id}/overrides/${productId}`, { method: "DELETE" }),

  // Price preview (cost breakdown)
  preview: (productId: string, retailerId?: string) =>
    request(`/pricing/preview?productId=${productId}${retailerId ? `&retailerId=${retailerId}` : ""}`),

  // Seed the chart from the master xlsx
  importChart: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const token = getAdminToken();
    const res = await fetch(`${API_BASE}/pricing/import`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Import failed");
    return data;
  },
};

// ── Audit Logs ───────────────────────────────────
export const adminAudit = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/audit${qs}`);
  },
  stats: () => request("/audit/stats"),
};

// ── Reports ──────────────────────────────────────
export type ReportColumn = { key: string; label: string };
export type ReportRunResult = { report: string; columns: ReportColumn[]; rows: any[]; total: number };

export const adminReports = {
  list: () => request<{ reports: { key: string; columns: ReportColumn[] }[] }>("/reports"),

  run: (reportType: string, params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<ReportRunResult>(`/reports/${reportType}${qs}`);
  },

  exportCsv: async (reportType: string, params?: Record<string, string>) => {
    const token = getAdminToken();
    const merged = { ...(params || {}), format: "csv" };
    const qs = "?" + new URLSearchParams(merged).toString();
    const res = await fetch(`${API_BASE}/reports/${reportType}${qs}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.status === 401) {
      clearAdminToken();
      window.location.href = "/admin/login";
      throw new Error("Session expired");
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Export failed");
    }
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition") || "";
    const match = cd.match(/filename="?([^";]+)"?/i);
    const filename = match?.[1] || `${reportType}.csv`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
