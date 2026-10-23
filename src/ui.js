import { readFile } from 'node:fs/promises';

export const uiUri = 'ui://thought-map/map.html';
export const uiMeta = { ui: { csp: { connectDomains: [], resourceDomains: [], frameDomains: [] } } };

export async function readUi(name) {
  try {
    return await readFile(new URL(`../web/dist/${name}.html`, import.meta.url), 'utf8');
  } catch {
    throw new Error('UI build unavailable. Run npm run build.');
  }
}

export function securityHeaders(res, { host = false, peer }) {
  res.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src ${host ? "'self'" : "'none'"}; frame-src ${host ? peer : "'none'"}; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ${host ? "'none'" : peer}`);
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), clipboard-write=()');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}
