// Frontend service wrapper for Seller Product APIs
// Provides small functions that call the backend endpoints and return parsed JSON.
// Uses `credentials: 'include'` so cookie-based JWT (httpOnly) is sent with requests.

const BASE = '/api/seller/products';

async function handleResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await res.json() : null;
  if (!res.ok) {
    // Log server response body to console to help debugging in dev
    // (keeps thrown error small but provides rich debug output in console)
    console.error('API error response', { status: res.status, body });
    const message = body?.message || body?.error || res.statusText || 'Request failed';
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export async function listSellerProducts({ limit = 20, offset = 0, search, size, color, orderBy, order } = {}) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  if (search) params.set('search', search);
  if (size) params.set('size', size);
  if (color) params.set('color', color);
  if (orderBy) params.set('orderBy', orderBy);
  if (order) params.set('order', order);

  const res = await fetch(`${BASE}?${params.toString()}`, { credentials: 'include' });
  return handleResponse(res);
}

export async function getSellerProduct(barCode) {
  const res = await fetch(`${BASE}/${encodeURIComponent(barCode)}`, { credentials: 'include' });
  return handleResponse(res);
}

export async function createSellerProduct(payload) {
  const res = await fetch(BASE, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function updateSellerProduct(barCode, payload) {
  const res = await fetch(`${BASE}/${encodeURIComponent(barCode)}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function uploadSellerProductImages(barCode, files = []) {
  const form = new FormData();
  files.forEach(f => form.append('images', f));
  const res = await fetch(`${BASE}/${encodeURIComponent(barCode)}/images`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  return handleResponse(res);
}

export async function deleteSellerProduct(barCode) {
  const res = await fetch(`${BASE}/${encodeURIComponent(barCode)}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  return handleResponse(res);
}

export default {
  listSellerProducts,
  getSellerProduct,
  createSellerProduct,
  updateSellerProduct,
  deleteSellerProduct,
  uploadSellerProductImages,
};
