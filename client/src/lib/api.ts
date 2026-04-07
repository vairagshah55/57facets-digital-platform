<<<<<<< HEAD
const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000") + "/api";
export const SERVER_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
=======
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";
export const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:5000";
>>>>>>> 88589a8854df7451baaccb9c09d3e9d31044ccea

// Converts a relative image path from the API (e.g. "/uploads/products/abc.jpg")
// into a full URL the browser can load
export function imageUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${SERVER_URL}${path}`;
}

function getToken(): string | null {
  return localStorage.getItem("sf_token");
}

export function setToken(token: string) {
  localStorage.setItem("sf_token", token);
}

export function clearToken() {
  localStorage.removeItem("sf_token");
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
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
    clearToken();
    window.location.href = "/retailer/login";
    throw new Error("Session expired");
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}

// ── Auth ──────────────────────────────────────────
export const auth = {
  requestOtp: (phone: string) =>
    request("/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),
  verifyOtp: (phone: string, otp: string) =>
    request("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone, otp }),
    }),
  me: () => request("/auth/me"),
};

// ── Products ──────────────────────────────────────
export const products = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/products${qs}`);
  },
  detail: (id: string) => request(`/products/${id}`),
  categories: () => request("/products/categories"),
  newArrivals: () => request("/products/new-arrivals"),
  recentlyViewed: () => request("/products/recently-viewed"),
  goldPrices: () => request("/products/meta/gold-prices"),
};

// ── Collections ───────────────────────────────────
export const collections = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/collections${qs}`);
  },
  detail: (id: string) => request(`/collections/${id}`),
};

// ── Wishlist ──────────────────────────────────────
export const wishlist = {
  list: () => request("/wishlist"),
  add: (productId: string) =>
    request("/wishlist", {
      method: "POST",
      body: JSON.stringify({ productId }),
    }),
  remove: (productId: string) =>
    request(`/wishlist/${productId}`, { method: "DELETE" }),
  bulkAdd: (productIds: string[]) =>
    request("/wishlist/bulk", {
      method: "POST",
      body: JSON.stringify({ productIds }),
    }),
  folders: () => request("/wishlist/folders"),
  createFolder: (name: string, color: string) =>
    request("/wishlist/folders", {
      method: "POST",
      body: JSON.stringify({ name, color }),
    }),
  updateFolder: (id: string, name: string, color: string) =>
    request(`/wishlist/folders/${id}`, {
      method: "PUT",
      body: JSON.stringify({ name, color }),
    }),
  deleteFolder: (id: string) =>
    request(`/wishlist/folders/${id}`, { method: "DELETE" }),
  moveToFolder: (folderId: string, wishlistIds: string[]) =>
    request(`/wishlist/folders/${folderId}/items`, {
      method: "POST",
      body: JSON.stringify({ wishlistIds }),
    }),
};

// ── Orders ────────────────────────────────────────
export const orders = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`/orders${qs}`);
  },
  detail: (id: string) => request(`/orders/${id}`),
  create: (items: any[], note?: string) =>
    request("/orders", {
      method: "POST",
      body: JSON.stringify({ items, note }),
    }),
  stats: () => request("/orders/summary/stats"),
  checkProduct: (productId: string) => request(`/orders/check-product/${productId}`),
};

// ── Notifications ─────────────────────────────────
export const notifications = {
  list: (unreadOnly?: boolean) =>
    request(`/notifications${unreadOnly ? "?unread_only=true" : ""}`),
  markRead: (id: string) =>
    request(`/notifications/${id}/read`, { method: "PUT" }),
  markAllRead: () =>
    request("/notifications/read-all", { method: "PUT" }),
};

// ── Uploads ───────────────────────────────────────
// These use FormData, not JSON, so we bypass the default request() helper
export const uploads = {
  productImages: async (productId: string, files: FileList | File[]) => {
    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append("images", file);
    }
    const token = getToken();
    const res = await fetch(`${API_BASE}/upload/product-images/${productId}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data;
  },
  setPrimary: (imageId: string) =>
    request(`/upload/product-images/${imageId}/primary`, { method: "PUT" }),
  deleteImage: (imageId: string) =>
    request(`/upload/product-images/${imageId}`, { method: "DELETE" }),
  categoryImage: async (categoryId: string, file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    const token = getToken();
    const res = await fetch(`${API_BASE}/upload/category-image/${categoryId}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data;
  },
  collectionCover: async (collectionId: string, file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    const token = getToken();
    const res = await fetch(`${API_BASE}/upload/collection-cover/${collectionId}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data;
  },
  listProductImages: (productId: string) =>
    request(`/upload/product-images/${productId}`),
};
