// src/api/adminPosts.js
// API client for Super Admin post moderation using shared axios instance

import api from "./api";

/**
 * GET /api/admin/posts
 * Params: page, pageSize, hiddenOnly, organizationId
 */
export async function fetchAdminPosts(params = {}) {
  const { page = 1, pageSize = 20, hiddenOnly, organizationId } = params;
  const q = {
    page,
    pageSize,
  };
  if (hiddenOnly !== undefined) q.hiddenOnly = hiddenOnly;
  if (organizationId !== undefined) q.organizationId = organizationId;

  const { data } = await api.get("/admin/posts", { params: q });
  // Expected response shape: { success: true, data: { items, page, pageSize, total } }
  return data.data;
}

/** GET single post details */
export async function fetchPostDetail(id) {
  const { data } = await api.get(`/admin/posts/${id}`);
  return data.data;
}

/** PATCH hide post */
export async function hidePost(id, reason) {
  const payload = { reason: reason ?? null };
  const { data } = await api.patch(`/admin/posts/${id}/hide`, payload);
  return data;
}

/** PATCH restore post */
export async function restorePost(id) {
  const { data } = await api.patch(`/admin/posts/${id}/restore`);
  return data;
}

/** DELETE post */
export async function deletePost(id) {
  const { data } = await api.delete(`/admin/posts/${id}`);
  return data;
}
