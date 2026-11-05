import { ipAddress, rewrite, next } from '@vercel/functions';

// ===== SOFT BOT FILTER — verification, not a block =====
// Datacenter ASN ya bot UA mile to seedha block NAHI — ek tap wali
// verification page dikhao. Asal user (VPN par bhi) ek tap mein andar,
// simple bots (jo tap nahi karte) ruk jate hain.
// Preview crawlers allowed hain taake link preview banta rahe.
// NO country block, NO referrer check (wohi asal users ko marta tha),
// NO IP list. Koi signal na mile to ALLOW (fail open).

// ===== Link preview crawlers — hamesha andar =====
const PREVIEW_UAS = [
  "facebookexternalhit", "facebot",
  "twitterbot", "linkedinbot", "whatsapp", "telegrambot",
  "slackbot", "discordbot", "pinterest", "vkshare", "skypeuripreview",
];

const BLOCKED_UAS = [
  // --- Generic automation pehchan ---
  "crawl", "spider", "scraper", "archiver",

  // --- Search engine crawlers ---
  "googlebot", "google-inspectiontool", "googleother", "google-extended",
  "apis-google", "mediapartners-google",
  "bingbot", "bingpreview", "msnbot",
  "slurp", "duckduckbot", "baiduspider", "yandex", "sogou", "exabot", "petalbot",

  // --- AI crawlers (jo links read / check karte hain) ---
  "gptbot", "chatgpt-user", "openai",
  "claudebot", "claude-user", "anthropic",
  "perplexitybot", "perplexity",
  "bytespider", "bytedance",
  "ccbot", "commoncrawl",
  "youbot", "andibot", "cohere-ai", "diffbot",
  "omgili", "omgilibot",

  // --- SEO / audit tools ---
  "ahrefsbot", "semrushbot", "mj12bot", "dotbot", "rogerbot",
  "screaming frog", "sitebulb", "seokicks", "dataforseo",

  // --- Uptime monitors ---
  "uptimerobot", "pingdom", "statuscake",

  // --- Headless browsers / automation frameworks ---
  "headless", "headlesschrome", "phantomjs", "selenium", "puppeteer", "playwright",

  // --- Scripting / CLI tools ---
  "curl", "wget", "python-requests", "python-urllib",
  "libwww-perl", "httpclient",
  "scrapy", "mechanize", "nutch", "heritrix", "httrack",
];

// ===== Bot / datacenter networks (ASN) =====
// Meta (Facebook) aur Google ke ASN JAAN BOOJH KAR NAHI HAIN taake
// preview crawlers ko roka na jaye. Sirf hosting/datacenter networks
// hain jahan se automated scans aate hain.
const BOT_ASNS = new Set([
  "16509", "14618",  // Amazon AWS
  "8075",            // Microsoft Azure
  "14061",           // DigitalOcean
  "16276",           // OVH
  "24940",           // Hetzner
  "20473",           // Vultr / Constant
  "51167",           // Contabo
]);

export default function middleware(request) {
  const url = new URL(request.url);

  // Pehle se verified user — seedha andar
  const cookies = request.headers.get('cookie') || '';
  if (cookies.includes('human=1')) {
    return next();
  }

  const userAgent = (request.headers.get('user-agent') || "").toLowerCase();

  // Preview crawlers — hamesha andar (link preview na toote)
  for (const ua of PREVIEW_UAS) {
    if (userAgent.includes(ua)) {
      return next();
    }
  }

  const clientASN = request.headers.get('x-vercel-ip-as-number') || "";
  const clientCountry = request.headers.get('x-vercel-ip-country') || "";
  const clientCity = request.headers.get('x-vercel-ip-city') || "";
  const clientIP = ipAddress(request) || "";

  // USA / Ireland / Sweden visitors ka aik-aik record — IP + location
  if (clientCountry && ["US", "IE", "SE"].includes(clientCountry.toUpperCase())) {
    console.log('[VISITOR] ' + JSON.stringify({
      t: new Date().toISOString(),
      path: url.pathname,
      ip: clientIP,
      country: clientCountry,
      city: clientCity || '-',
      ua: userAgent.slice(0, 120),
      asn: clientASN || '-',
    }));
  }

  let triggerVerification = false;
  let triggerWhy = '';
  if (clientASN && BOT_ASNS.has(clientASN)) {
    triggerVerification = true;
    triggerWhy = 'asn:' + clientASN;
  }
  if (!triggerVerification) {
    for (const ua of BLOCKED_UAS) {
      if (userAgent.includes(ua)) {
        triggerVerification = true;
        triggerWhy = 'ua:' + ua;
        break;
      }
    }
  }

  // Har bot trigger ko note karo — time, page, UA, ASN, country
  if (triggerVerification) {
    console.log('[BOT-FILTER] ' + JSON.stringify({
      t: new Date().toISOString(),
      path: url.pathname,
      why: triggerWhy,
      ua: userAgent.slice(0, 120),
      asn: clientASN || '-',
      country: clientCountry || '-',
    }));
    return rewrite(new URL('/verification.html', request.url));
  }

  return next();
}

export const config = {
  matcher: ['/', '/how-to-upload-bulk-reels.html', '/donald-trump-live-update.html'],
};
