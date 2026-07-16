import { API_BASE } from "../constants/api";

export interface StatCard {
  total: number;
  trend: number;       // % change vs previous window
  series: number[];    // per-day values for the sparkline
}

export interface AdminOverview {
  days: number;
  cards: {
    users: StatCard;
    trips: StatCard;
    deals: StatCard | null; // null until the deals table exists
    revenue: StatCard;
  };
  popular: { city: string; count: number; share: number }[];
  activity: { type: "user" | "trip" | "deal"; text: string; ts: string }[];
}

export interface AdminUser {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  trip_count: number;
  role: "Admin" | "Member";
  status: "Active" | "Inactive";
  last_sign_in_at: string | null;
}

export interface Deal {
  id: string;
  city: string;
  country: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string;
  agency: string | null;
  valid_until: string | null;
  image_url: string | null;
  active: boolean;
  created_at: string;
}

export interface NewDeal {
  city: string;
  country: string;
  title: string;
  description?: string;
  price?: number;
  currency?: string;
  agency?: string;
  valid_until?: string;
  /** Image as a data URL (PNG/JPEG/WebP, ≤ 2.5 MB) — uploaded to Storage server-side */
  photo?: string;
}

export interface NewUser {
  full_name: string;
  email: string;
  password: string;
}

export type InquiryStatus = "new" | "contacted" | "closed";

export interface Inquiry {
  id: string;
  deal_id: string;
  user_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: InquiryStatus;
  created_at: string;
  deal: { title: string; city: string; country: string; agency: string | null } | null;
}

async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token ?? ""}`,
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `Request failed (${res.status})`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return res.json();
}

export const adminService = {
  getOverview: (days = 30) => adminFetch<AdminOverview>(`/api/admin/overview?days=${days}`),

  getUsers: () => adminFetch<AdminUser[]>("/api/admin/users"),

  /** Trip counts keyed by lower-cased city name */
  getDestinationStats: () => adminFetch<Record<string, number>>("/api/admin/destination-stats"),

  createUser: (user: NewUser) =>
    adminFetch<{ success: boolean; id: string }>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(user),
    }),

  updateUser: (id: string, full_name: string) =>
    adminFetch<{ success: boolean; user: AdminUser }>(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ full_name }),
    }),

  deleteUser: (id: string) =>
    adminFetch<{ success: boolean; deletedTrips: number }>(`/api/admin/users/${id}`, {
      method: "DELETE",
    }),

  // Deals — read is public, write is admin-only
  getDeals: async (): Promise<Deal[]> => {
    const res = await fetch(`${API_BASE}/api/deals`);
    return res.ok ? res.json() : [];
  },

  createDeal: (deal: NewDeal) =>
    adminFetch<{ success: boolean; deal: Deal }>("/api/admin/deals", {
      method: "POST",
      body: JSON.stringify(deal),
    }),

  deleteDeal: (id: string) =>
    adminFetch<{ success: boolean }>(`/api/admin/deals/${id}`, { method: "DELETE" }),

  getInquiries: () => adminFetch<Inquiry[]>("/api/admin/inquiries"),

  updateInquiryStatus: (id: string, status: InquiryStatus) =>
    adminFetch<{ success: boolean }>(`/api/admin/inquiries/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};
