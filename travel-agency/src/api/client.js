const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("voyage_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error || "Request failed");
    err.status = res.status;
    err.errors = data.errors;
    throw err;
  }
  return data;
}

export const api = {
  // Auth
  register:       (body)        => request("/auth/register",       { method: "POST", body: JSON.stringify(body) }),
  login:          (body)        => request("/auth/login",          { method: "POST", body: JSON.stringify(body) }),
  getMe:          ()            => request("/auth/me"),
  updateMe:       (body)        => request("/auth/me",             { method: "PATCH", body: JSON.stringify(body) }),
  changePassword: (body)        => request("/auth/change-password",{ method: "POST",  body: JSON.stringify(body) }),

  // Packages
  getPackages:    (params = {}) => request("/packages?" + new URLSearchParams(params)),
  getPackage:     (id)          => request(`/packages/${id}`),
  createPackage:  (body)        => request("/packages",            { method: "POST",  body: JSON.stringify(body) }),
  updatePackage:  (id, body)    => request(`/packages/${id}`,      { method: "PATCH", body: JSON.stringify(body) }),
  deletePackage:  (id)          => request(`/packages/${id}`,      { method: "DELETE" }),

  // Bookings
  createBooking:  (body)        => request("/bookings",            { method: "POST",  body: JSON.stringify(body) }),
  getMyBookings:  ()            => request("/bookings/me"),
  getBooking:     (id)          => request(`/bookings/${id}`),
  cancelBooking:  (id)          => request(`/bookings/${id}`,      { method: "DELETE" }),
  getAllBookings:  (params = {}) => request("/bookings?" + new URLSearchParams(params)),
  updateStatus:   (id, status)  => request(`/bookings/${id}/status`,{ method: "PATCH", body: JSON.stringify({ status }) }),

  // Admin
  getStats:       ()            => request("/admin/stats"),
  getAdminUsers:  (params = {}) => request("/admin/users?" + new URLSearchParams(params)),
  getRevenue:     ()            => request("/admin/revenue"),
  updateUserRole: (id, role)    => request(`/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),

  // Reviews
  createReview:   (body)        => request("/reviews",             { method: "POST",  body: JSON.stringify(body) }),
  getReviews:     (packageId)   => request(`/reviews/package/${packageId}`),
};
