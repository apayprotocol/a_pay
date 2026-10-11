/**
 * Security & Anti-Abuse Utility for A-Pay Web Application
 *
 * Implements defensive checks against:
 * 1. Server-Side Request Forgery (SSRF) targeting cloud metadata or internal subnets
 * 2. Unauthenticated administrative spoofing
 * 3. Rate-limiting key normalization
 */

// Denied hostnames and domain suffixes
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
  'metadata.google.internal',
  'metadata',
  'instance-data',
]);

const BLOCKED_SUFFIXES = ['.local', '.internal', '.lan', '.corp', '.home', '.onion', '.arpa'];

/**
 * Checks whether an IPv4 address string falls into a private or link-local subnet.
 */
function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }

  const [a, b] = parts;

  // 127.0.0.0/8 - Loopback
  if (a === 127) return true;

  // 10.0.0.0/8 - Private Class A
  if (a === 10) return true;

  // 172.16.0.0/12 - Private Class B (172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 - Private Class C
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 - Link-local & Cloud Metadata (169.254.169.254)
  if (a === 169 && b === 254) return true;

  // 0.0.0.0/8 - Current network (only valid as source address)
  if (a === 0) return true;

  // 100.64.0.0/10 - Shared Address Space (CGNAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  return false;
}

export interface UrlValidationOptions {
  allowLocalhostInDev?: boolean;
}

/**
 * Validates a user-supplied URL to guarantee safe server-side requests.
 * Blocks cloud metadata (e.g. AWS/GCP 169.254.169.254), loopback addresses,
 * private networks, and unsupported URI schemes.
 */
export function validateSafePublicUrl(
  urlString: string,
  options: UrlValidationOptions = {},
): { safe: boolean; error?: string; url?: URL } {
  if (!urlString || typeof urlString !== 'string') {
    return { safe: false, error: 'URL must be a non-empty string' };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlString.trim());
  } catch {
    return { safe: false, error: `Invalid URL format: "${urlString}"` };
  }

  // Scheme must be strictly http or https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      safe: false,
      error: `Forbidden URL protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Strip brackets from IPv6 hostnames
  const cleanHost = hostname.replace(/^\[|\]$/g, '');

  // Strict check for cloud metadata service (NEVER allow, even in dev)
  if (cleanHost === '169.254.169.254' || cleanHost === '169.254.169.253') {
    return {
      safe: false,
      error: 'Access to cloud instance metadata service is strictly forbidden.',
    };
  }

  // Development and test localhost allowance if explicitly enabled
  const isDevOrTest =
    process.env.NODE_ENV === 'development' ||
    process.env.NODE_ENV === 'test' ||
    process.env.APAY_ALLOW_LOCALHOST === 'true';
  if (
    options.allowLocalhostInDev &&
    isDevOrTest &&
    (cleanHost === 'localhost' || cleanHost === '127.0.0.1' || cleanHost === '::1')
  ) {
    return { safe: true, url: parsed };
  }

  // Check against static blocked hostnames
  if (BLOCKED_HOSTNAMES.has(cleanHost)) {
    return {
      safe: false,
      error: `Access to internal host "${cleanHost}" is restricted.`,
    };
  }

  // Check against blocked internal domain suffixes
  for (const suffix of BLOCKED_SUFFIXES) {
    if (cleanHost.endsWith(suffix)) {
      return {
        safe: false,
        error: `Access to internal domain suffix "${suffix}" is restricted.`,
      };
    }
  }

  // Check if hostname is an IPv4 address and whether it falls into private/reserved subnets
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cleanHost)) {
    if (isPrivateOrReservedIpv4(cleanHost)) {
      return {
        safe: false,
        error: `Access to private or link-local IP "${cleanHost}" is forbidden.`,
      };
    }
  }

  return { safe: true, url: parsed };
}

/**
 * Validates founder / administrative authorization header or token.
 */
export function isAuthorizedFounder(request: Request, founderWallet: string): boolean {
  const adminSecret = process.env.ADMIN_SECRET || process.env.FOUNDER_SECRET_KEY;
  const authHeader = request.headers.get('authorization') || '';
  const adminHeader = request.headers.get('x-admin-key') || '';

  // 1. If an admin secret is configured on the server, require matching Bearer token or x-admin-key
  if (adminSecret) {
    if (authHeader === `Bearer ${adminSecret}` || adminHeader === adminSecret) {
      return true;
    }
  }

  // 2. In local development or test environments ONLY, allow founder wallet matching if admin secret is unset
  const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  const walletHeader = request.headers.get('x-wallet-address') || '';
  if (
    isDevOrTest &&
    !adminSecret &&
    walletHeader &&
    founderWallet &&
    walletHeader.toLowerCase() === founderWallet.toLowerCase()
  ) {
    return true;
  }

  return false;
}

/**
 * Detects whether a domain or URL is a placeholder/demo domain
 * that should not be published to live registries or eligible for production genesis grants.
 */
export function isPlaceholderOrDemoDomain(urlOrDomain: string): boolean {
  if (!urlOrDomain || typeof urlOrDomain !== 'string') return true;
  const clean = urlOrDomain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0];

  if (!clean || clean === 'unknown') return true;

  if (
    process.env.APAY_ALLOW_LOCALHOST === 'true' &&
    (clean === 'localhost' || clean === '127.0.0.1')
  ) {
    return false;
  }

  const demoPatterns = [
    'yourdomain.com',
    'api.yourdomain.com',
    'example.com',
    'example.org',
    'example.net',
    'httpbin.org',
    'localhost',
    '127.0.0.1',
    'test.com',
    'mysite.com',
    'foo.com',
    'bar.com',
  ];

  return demoPatterns.some((pattern) => clean === pattern || clean.endsWith(`.${pattern}`));
}
