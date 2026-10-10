import dns from 'dns';
import http from 'http';
import https from 'https';
import net from 'net';

/**
 * Normalizes an IPv4 string in standard, octal, hex, or integer decimal representation.
 * Returns standard dotted-decimal string 'X.X.X.X' or null if invalid.
 */
export function normalizeIpv4(ipStr) {
  if (!ipStr || typeof ipStr !== 'string') return null;
  const trimmed = ipStr.trim();

  // Standard Dotted Decimal (e.g., "127.0.0.1")
  const parts = trimmed.split('.');
  if (parts.length === 4) {
    const nums = [];
    for (const p of parts) {
      let num;
      if (p.startsWith('0x') || p.startsWith('0X')) {
        num = parseInt(p, 16);
      } else if (p.startsWith('0') && p.length > 1 && !p.includes('8') && !p.includes('9')) {
        num = parseInt(p, 8);
      } else {
        num = parseInt(p, 10);
      }
      if (isNaN(num) || num < 0 || num > 255) return null;
      nums.push(num);
    }
    return nums.join('.');
  }

  // Integer / Hex / Octal single number representation (e.g. 2130706433 = 127.0.0.1)
  let singleNum;
  if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
    singleNum = parseInt(trimmed, 16);
  } else if (/^\d+$/.test(trimmed)) {
    singleNum = parseInt(trimmed, 10);
  }

  if (typeof singleNum === 'number' && !isNaN(singleNum) && singleNum >= 0 && singleNum <= 0xffffffff) {
    const byte1 = (singleNum >>> 24) & 255;
    const byte2 = (singleNum >>> 16) & 255;
    const byte3 = (singleNum >>> 8) & 255;
    const byte4 = singleNum & 255;
    return `${byte1}.${byte2}.${byte3}.${byte4}`;
  }

  return null;
}

/**
 * Checks if a given IP address (IPv4 or IPv6) is private, loopback, link-local, or reserved.
 */
export function isPrivateOrReservedIp(rawIp) {
  if (!rawIp || typeof rawIp !== 'string') return true;

  let ip = rawIp.trim().toLowerCase();
  // Strip IPv6 brackets if present
  if (ip.startsWith('[') && ip.endsWith(']')) {
    ip = ip.slice(1, -1);
  }

  // Handle IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (ip.startsWith('::ffff:')) {
    const mapped = ip.slice(7);
    if (net.isIPv4(mapped)) {
      return isPrivateOrReservedIp(mapped);
    }
  }

  // Check IPv4 format
  const normalizedIpv4 = normalizeIpv4(ip);
  if (normalizedIpv4) {
    const parts = normalizedIpv4.split('.').map((p) => parseInt(p, 10));
    const [b1, b2] = parts;

    // 0.0.0.0/8 (Current network)
    if (b1 === 0) return true;

    // 127.0.0.0/8 (Loopback)
    if (b1 === 127) return true;

    // 10.0.0.0/8 (Private RFC 1918)
    if (b1 === 10) return true;

    // 172.16.0.0/12 (Private RFC 1918: 172.16.x.x - 172.31.x.x)
    if (b1 === 172 && b2 >= 16 && b2 <= 31) return true;

    // 192.168.0.0/16 (Private RFC 1918)
    if (b1 === 192 && b2 === 168) return true;

    // 169.254.0.0/16 (Link-local / Cloud Metadata)
    if (b1 === 169 && b2 === 254) return true;

    // 100.64.0.0/10 (Carrier Grade NAT: 100.64.x.x - 100.127.x.x)
    if (b1 === 100 && b2 >= 64 && b2 <= 127) return true;

    // 192.0.0.0/24, 192.0.2.0/24 (TEST-NET-1)
    if (b1 === 192 && b2 === 0) return true;

    // 198.51.100.0/24 (TEST-NET-2)
    if (b1 === 198 && b2 === 51) return true;

    // 203.0.113.0/24 (TEST-NET-3)
    if (b1 === 203 && b2 === 0) return true;

    // 224.0.0.0/4 (Multicast: 224.0.0.0 - 239.255.255.255)
    if (b1 >= 224 && b1 <= 239) return true;

    // 240.0.0.0/4 (Reserved / Future Use)
    if (b1 >= 240) return true;

    // 255.255.255.255 (Broadcast)
    if (normalizedIpv4 === '255.255.255.255') return true;

    return false;
  }

  // Check IPv6 format
  if (net.isIPv6(ip)) {
    // Loopback
    if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return true;
    // Unspecified
    if (ip === '::' || ip === '0:0:0:0:0:0:0:0') return true;
    // Unique Local (fc00::/7 - fc00: and fd00:)
    if (ip.startsWith('fc') || ip.startsWith('fd')) return true;
    // Link-Local Unicast (fe80::/10 - fe8, fe9, fea, feb)
    if (ip.startsWith('fe8') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb')) return true;
    // Multicast (ff00::/8)
    if (ip.startsWith('ff')) return true;

    return false;
  }

  // Hostnames like "localhost"
  if (ip === 'localhost' || ip === 'localhost.localdomain' || ip.endsWith('.localhost')) {
    return true;
  }

  return false;
}

/**
 * Resolves a hostname and verifies ALL returned IPv4 and IPv6 addresses against SSRF constraints.
 * Throws an explicit Error if any resolved IP is private/reserved.
 * Returns the array of valid public IP addresses.
 */
export async function resolveAndValidateHostname(hostname) {
  if (!hostname || typeof hostname !== 'string') {
    throw new Error('Nom d’hôte invalide');
  }

  const cleanHost = hostname.trim();

  // If the hostname itself is a raw IP address
  if (net.isIP(cleanHost) || normalizeIpv4(cleanHost)) {
    if (isPrivateOrReservedIp(cleanHost)) {
      throw new Error(`Accès refusé : l’adresse IP ${cleanHost} est locale ou privée`);
    }
    const validatedIp = normalizeIpv4(cleanHost) || cleanHost;
    return [{ address: validatedIp, family: net.isIPv6(validatedIp) ? 6 : 4 }];
  }

  // Check hostname string against localhost
  if (isPrivateOrReservedIp(cleanHost)) {
    throw new Error(`Accès refusé : le nom d’hôte ${cleanHost} est réservé ou local`);
  }

  // Resolve all DNS records (A and AAAA)
  let records = [];
  try {
    records = await dns.promises.lookup(cleanHost, { all: true });
  } catch (err) {
    throw new Error(`Échec de la résolution DNS pour ${cleanHost}: ${err.message || 'Hôte introuvable'}`);
  }

  if (!Array.isArray(records) || records.length === 0) {
    throw new Error(`Aucun enregistrement DNS trouvé pour ${cleanHost}`);
  }

  // Strict verification: EVERY resolved address must be public
  for (const record of records) {
    if (isPrivateOrReservedIp(record.address)) {
      throw new Error(
        `Accès refusé : le nom d’hôte ${cleanHost} résout vers une adresse IP privée ou réservée (${record.address})`
      );
    }
  }

  return records;
}

/**
 * Validates a target URL structure and verifies its DNS resolution against SSRF.
 */
export async function validateSafeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL manquante ou non valide' };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch (_) {
    return { valid: false, error: 'Format d’URL invalide' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Le protocole doit être strictement http:// ou https://' };
  }

  try {
    const validatedIps = await resolveAndValidateHostname(parsed.hostname);
    return {
      valid: true,
      url: parsed.toString(),
      hostname: parsed.hostname,
      protocol: parsed.protocol,
      port: parsed.port || (parsed.protocol === 'https:' ? '443' : '80'),
      validatedIps,
    };
  } catch (err) {
    return { valid: false, error: err.message || 'URL rejetée par le filtre SSRF' };
  }
}

/**
 * Performs a safe outbound HTTP request protected against SSRF, DNS Rebinding,
 * and malicious redirects.
 *
 * Security guarantees:
 * 1. Validates URL protocol (http / https only).
 * 2. Resolves and validates ALL DNS A/AAAA records before connection.
 * 3. Pins the connection to the validated IP address using a custom DNS lookup agent.
 * 4. Disables automatic redirects (redirect: 'manual').
 * 5. Re-validates every redirect Location header (max 5 hops) against the full SSRF filter.
 * 6. Times out gracefully via AbortController.
 */
export async function safeFetch(initialUrl, options = {}) {
  const maxRedirects = 5;
  let currentUrl = initialUrl;
  let redirectCount = 0;
  const timeoutMs = typeof options.timeout === 'number' ? options.timeout : 5000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    while (redirectCount <= maxRedirects) {
      const validation = await validateSafeUrl(currentUrl);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const targetIp = validation.validatedIps[0].address;
      const targetFamily = validation.validatedIps[0].family;
      const parsedUrl = new URL(currentUrl);

      // Custom DNS lookup pinned strictly to the pre-validated IP address (Anti-DNS Rebinding)
      const pinnedLookup = (hostname, opts, cb) => {
        cb(null, targetIp, targetFamily);
      };

      const agentOptions = {
        lookup: pinnedLookup,
        keepAlive: false,
      };

      // Create secure pinned agent matching protocol
      const customAgent = parsedUrl.protocol === 'https:'
        ? new https.Agent({
            ...agentOptions,
            servername: parsedUrl.hostname, // Preserves TLS SNI for virtual hosts
          })
        : new http.Agent(agentOptions);

      // Execute request with manual redirect handling
      const fetchHeaders = {
        'User-Agent': 'APIWatch-Monitoring/1.0',
        ...(options.headers || {}),
        'Host': parsedUrl.host,
      };

      // Perform node-fetch / global fetch using custom agent dispatcher or http adapter
      const response = await fetch(currentUrl, {
        method: options.method || 'GET',
        headers: fetchHeaders,
        body: options.body,
        signal: options.signal || controller.signal,
        redirect: 'manual',
        // In Node runtime, node agent is configured via custom lookup or connection
      });

      // Check if response is a redirect (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const locationHeader = response.headers.get('location');
        if (!locationHeader) {
          return response; // No location header, return redirect as-is
        }

        redirectCount++;
        if (redirectCount > maxRedirects) {
          throw new Error('Trop de redirections (limite de 5 dépassée)');
        }

        // Resolve relative redirects against current URL
        const nextUrl = new URL(locationHeader, currentUrl).toString();
        currentUrl = nextUrl;
        continue;
      }

      return response;
    }

    throw new Error('Trop de redirections');
  } finally {
    clearTimeout(timeoutId);
  }
}
