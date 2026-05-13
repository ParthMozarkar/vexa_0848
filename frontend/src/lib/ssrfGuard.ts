/**
 * SSRF Guard — validateProxyUrl
 *
 * Validates a URL before it is fetched by an API route, preventing Server-Side
 * Request Forgery attacks. Enforces:
 *  1. HTTPS-only scheme
 *  2. Explicit hostname allowlist (mirrors image-hosts.config.mjs)
 *  3. RFC-1918 / loopback / link-local IP block (post-parse, pre-DNS)
 */

/** Shape returned on success. */
export type ValidProxyUrl = { valid: true; parsed: URL };
/** Shape returned on failure. */
export type InvalidProxyUrl = { valid: false; reason: string };

export type ProxyUrlValidation = ValidProxyUrl | InvalidProxyUrl;

// ---------------------------------------------------------------------------
// Allowlist — mirrors image-hosts.config.mjs
// Exact hostnames and wildcard suffix patterns (*.example.com).
// ---------------------------------------------------------------------------

const EXACT_HOSTS: ReadonlySet<string> = new Set([
  'images.unsplash.com',
  'images.pexels.com',
  'images.pixabay.com',
  'img.rocket.new',
  'thenewblack.ai',
]);

// Wildcard suffix patterns — hostname must end with this suffix
// (e.g. "**.supabase.co" matches "abc.supabase.co", "abc.def.supabase.co")
const WILDCARD_SUFFIXES: ReadonlyArray<string> = [
  '.supabase.co',
  '.r2.cloudflarestorage.com',
  '.thenewblack.ai',
];

// ---------------------------------------------------------------------------
// RFC-1918 / loopback / link-local patterns
// These are checked against the parsed hostname string ONLY (no DNS resolution).
// If the attacker provides an IP literal that falls in these ranges we block it.
// ---------------------------------------------------------------------------

/** Returns true if the hostname is a private, loopback or link-local address. */
function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();

  // Localhost by name
  if (h === 'localhost') return true;

  // IPv6 loopback (brackets already stripped by URL parser)
  if (h === '::1' || h === '[::1]') return true;

  // All-zeros address
  if (h === '0.0.0.0') return true;

  // For IPv4 we parse each octet
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [, a, b, c] = ipv4.map(Number) as [string, number, number, number, number];

    // 127.0.0.0/8 — loopback
    if (a === 127) return true;

    // 10.0.0.0/8 — RFC-1918
    if (a === 10) return true;

    // 172.16.0.0/12 — RFC-1918
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16 — RFC-1918
    if (a === 192 && b === 168) return true;

    // 169.254.0.0/16 — link-local
    if (a === 169 && b === 254) return true;
  }

  return false;
}

/** Returns true if hostname matches the allowlist (exact or wildcard). */
function isAllowedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();

  if (EXACT_HOSTS.has(h)) return true;

  for (const suffix of WILDCARD_SUFFIXES) {
    if (h.endsWith(suffix)) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates a URL string for use in a server-side proxy fetch.
 *
 * @param url - Raw URL string from untrusted input.
 * @returns `{ valid: true, parsed }` on success, `{ valid: false, reason }` on rejection.
 */
export function validateProxyUrl(url: string): ProxyUrlValidation {
  // 1. Parse
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  // 2. Scheme must be https
  if (parsed.protocol !== 'https:') {
    return { valid: false, reason: `Scheme "${parsed.protocol}" not allowed; only https is permitted` };
  }

  // 3. Allowlist check
  const hostname = parsed.hostname.toLowerCase();
  if (!isAllowedHost(hostname)) {
    return { valid: false, reason: `Hostname "${hostname}" is not in the proxy allowlist` };
  }

  // 4. Block private / loopback / link-local IPs
  if (isPrivateHost(hostname)) {
    return { valid: false, reason: `Hostname "${hostname}" resolves to a private or reserved address` };
  }

  return { valid: true, parsed };
}
