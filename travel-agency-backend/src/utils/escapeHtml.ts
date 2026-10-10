const MAP: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escape user-supplied text before interpolating it into HTML (emails). */
export const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => MAP[c] ?? c);
