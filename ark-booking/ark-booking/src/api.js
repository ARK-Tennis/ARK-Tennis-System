// Base URL of your deployed Apps Script web app (the /exec URL).
// Set this in a .env file as VITE_API_BASE_URL, or it falls back to the placeholder below.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE';

export async function apiGet(action, params = {}) {
  const query = new URLSearchParams({ action, ...params }).toString();
  const res = await fetch(`${BASE_URL}?${query}`);
  return res.json();
}

// Apps Script doesn't support custom CORS headers on POST, so we send the body as
// text/plain to avoid triggering a preflight OPTIONS request the browser would block.
export async function apiPost(action, body = {}) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...body }),
  });
  return res.json();
}
