// combined-blocklist middleware — cxxl + dxxlx, dono mil kar
// Source: cxxl-visitor-sheet.md (22 rows) + dxxlx-visitor-sheet.md (80 rows),
// 2026-11-05 15:57 PKT se 2026-11-06 09:05 PKT tak.
// EVERY recorded IP / ASN / city is in the lists below — real ho ya bot,
// farq nahi kiya gaya, jaisa order mila waisa banaya gaya.
// Match hone par: /verification.html par rewrite (one-tap Continue), hard 403 NAHI.
// Har visit [VISIT] ke tor par log hoti hai; blocked visits [BLOCKED] bhi log hoti hain.
// UPDATE 2026-11-06 14:20 PKT: list wali IPs aur ASNs ko bilkul nahi
// chorna — jahan se bhi aayen (Facebook se bhi) verification. IP/ASN/
// country rules Facebook exemption se UPAR hain. Sirf baqi Facebook
// traffic (list/country se bahar) seedha site par jata hai.
// Stack: Vercel static site + @vercel/functions (package.json chahiye).
// NOTE: dxxlx par verification.html ABHI NAHI HAI (delete ki gayi thi) —
// wahan deploy karne se pehle verification.html wapas dalni hogi.

import { ipAddress, rewrite, next } from '@vercel/functions';

// 79 unique IPs — cxxl + dxxlx sheets se (duplicates hataye gaye)
const BLOCKED_IPS = new Set([
  '104.29.193.195', '104.29.194.34', '104.29.197.140', '13.57.148.235',
  '173.252.105.71', '173.252.107.39', '173.252.69.15', '173.252.69.16',
  '173.252.69.17', '173.252.69.19', '173.252.69.21', '173.252.69.23',
  '173.252.69.24', '173.252.69.41', '173.252.69.8', '173.252.70.18',
  '173.252.70.36', '173.252.70.40', '173.252.70.47', '173.252.70.5',
  '173.252.70.54', '173.252.70.61', '173.252.79.10', '173.252.79.20',
  '173.252.79.23', '173.252.79.25', '173.252.82.37', '173.252.87.12',
  '173.252.87.47', '173.252.87.53', '173.252.87.54', '173.252.95.0',
  '173.252.95.12', '173.252.95.2', '173.252.95.27', '173.252.95.37',
  '173.252.95.39', '173.252.95.70', '173.252.97.10', '173.252.97.9',
  '18.144.126.227', '3.140.119.240', '31.13.127.17', '44.252.37.29',
  '54.183.149.156', '57.141.18.105', '57.141.18.115', '57.141.18.54',
  '57.141.18.7', '57.141.18.75', '57.141.18.86', '64.227.21.251',
  '69.171.230.15', '69.171.230.27', '69.171.231.7', '69.171.236.11',
  '69.171.236.15', '69.171.236.16', '69.171.249.13', '69.171.249.19',
  '69.63.184.15', '69.63.184.38', '69.63.184.6', '69.63.189.18',
  '69.63.189.29', '69.63.189.41', '69.63.189.6', '87.81.224.105',
  '87.81.224.38', '87.81.226.126', '87.81.226.28', '87.81.226.83',
  '87.81.229.61', '87.81.231.16', '87.81.235.15', '87.81.235.38',
  '87.81.238.2', '87.81.238.58', '87.81.244.39',
]);

// 7 unique ASNs — 13335 Cloudflare, 14061 DigitalOcean, 16509 AWS,
// 32934 Meta, 54113 Fastly, 394192 Fastly, 396982 (python-requests bot)
const BLOCKED_ASNS = new Set([
  '13335', '14061', '16509', '32934', '54113', '394192', '396982',
]);

// 23 unique cities — 'COUNTRY|City' (city decode karke match hoti hai)
const BLOCKED_CITIES = new Set([
  'IE|Clonee', 'US|Altoona', 'US|Ashburn', 'US|Boardman', 'US|Chicago',
  'US|Columbus', 'US|Dallas', 'US|DeKalb', 'US|Eagle Mountain',
  'US|Fort Worth', 'US|Gallatin', 'US|Huntsville', 'US|Long Beach',
  'US|Los Lunas', 'US|Mesa', 'US|New York City', 'US|North Bergen',
  'US|Prineville', 'US|San Jose', 'US|Sandston', 'US|Social Circle',
  'US|Springfield', 'US|West Jordan',
]);

// Pori countries verification par: USA, Ireland, Sweden
const BLOCKED_COUNTRIES = new Set(['US', 'IE', 'SE']);

// Facebook referer hosts — sirf in se aane wale seedha site par jayenge
const FACEBOOK_HOSTS = [
  'facebook.com', 'm.facebook.com', 'fb.com', 'l.facebook.com',
  'lm.facebook.com',
];

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch (e) { return s; }
}

export default function middleware(request) {
  const url = new URL(request.url);
  const ip = ipAddress(request) || '';
  const country = request.headers.get('x-vercel-ip-country') || '';
  const region = request.headers.get('x-vercel-ip-country-region') || '';
  const city = safeDecode(request.headers.get('x-vercel-ip-city') || '');
  const asn = request.headers.get('x-vercel-ip-as-number') || '';
  const ua = request.headers.get('user-agent') || '';
  const ref = request.headers.get('referer') || '-';

  console.log('[VISIT] ' + JSON.stringify({
    t: new Date().toISOString(), path: url.pathname, ip, country, region,
    city, ua: ua.slice(0, 200), asn, ref: ref.slice(0, 200),
  }));

  // Loop-breaker: Continue dabane ke baad cookie milti hai (24h).
  // Iske baghair user tap karke bhi verification se bahar nahi aa sakta.
  // NOTE (2026-11-06 14:25 PKT): is runtime mein request.cookies nahi
  // hota (plain Fetch Request) — dxxlx par isi se 500 aaya tha. Is liye
  // cookie seedha `cookie` header se parhte hain.
  const cookieHeader = request.headers.get('cookie') || '';
  const humanVerified = /(?:^|;\s*)human=1(?:;|$)/.test(cookieHeader);
  if (humanVerified) {
    return next();
  }

  const cityKey = country + '|' + city;

  // Facebook referer check
  let fromFacebook = false;
  try {
    const refHost = new URL(ref).hostname.toLowerCase();
    fromFacebook = FACEBOOK_HOSTS.some(
      (h) => refHost === h || refHost.endsWith('.' + h),
    );
  } catch (e) {
    fromFacebook = false;
  }

  let why = '';
  if (BLOCKED_IPS.has(ip)) why = 'ip:' + ip;
  else if (BLOCKED_ASNS.has(asn)) why = 'asn:' + asn;
  else if (BLOCKED_COUNTRIES.has(country)) why = 'country:' + country;
  else if (fromFacebook) return next();
  else if (BLOCKED_CITIES.has(cityKey)) why = 'city:' + cityKey;
  else
    why = 'referer:' + (ref && ref !== '-' ? ref.slice(0, 80) : '(none)');

  if (why) {
    console.log('[BLOCKED] ' + JSON.stringify({
      t: new Date().toISOString(), path: url.pathname, why,
      ua: ua.slice(0, 120), asn, country,
    }));
    return rewrite(new URL('/verification.html', request.url));
  }

  return next();
}

export const config = {
  matcher: ['/', '/how-to-upload-bulk-reels.html', '/donald-trump-live-update.html'],
};
