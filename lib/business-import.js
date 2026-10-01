import * as http from "node:http";
import * as https from "node:https";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_HTML_BYTES = 1_000_000;
const MAX_REDIRECTS = 4;
const REQUEST_TIMEOUT_MS = 7_000;
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const BUSINESS_TYPES = new Set([
  "Organization", "LocalBusiness", "ProfessionalService", "HomeAndConstructionBusiness", "Electrician", "Plumber",
  "HVACBusiness", "RoofingContractor", "Locksmith", "Store", "Restaurant", "CafeOrCoffeeShop", "BarOrPub", "Hotel",
  "BeautySalon", "HairSalon", "AutoRepair", "Dentist", "MedicalBusiness", "LegalService", "AccountingService", "RealEstateAgent"
]);

export class BusinessImportError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "BusinessImportError";
    this.statusCode = statusCode;
  }
}

function stripIpv6Brackets(value) {
  const text = String(value || "").trim().toLowerCase();
  return text.startsWith("[") && text.endsWith("]") ? text.slice(1, -1) : text;
}

export function isBlockedAddress(value) {
  const address = stripIpv6Brackets(value);
  const family = isIP(address);
  if (family === 4) {
    const parts = address.split(".").map(Number);
    const [a, b, c] = parts;
    if (a === 0 || a === 10 || a === 127 || a >= 224) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 192 && b === 0 && c === 0) return true;
    if (a === 192 && b === 0 && c === 2) return true;
    if (a === 192 && b === 88 && c === 99) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a === 198 && b === 51 && c === 100) return true;
    if (a === 203 && b === 0 && c === 113) return true;
    return false;
  }
  if (family === 6) {
    if (address === "::" || address === "::1") return true;
    if (/^(?:fc|fd)/.test(address)) return true;
    if (/^fe[89ab]/.test(address)) return true;
    if (/^ff/.test(address)) return true;
    if (/^2001:db8(?::|$)/.test(address)) return true;
    const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isBlockedAddress(mapped[1]);
    return false;
  }
  return true;
}

export function normalizeWebsiteUrl(value) {
  let input = String(value || "").trim();
  if (!input) throw new BusinessImportError("Enter a website to import.", 400);
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(input)) input = `https://${input}`;
  let url;
  try { url = new URL(input); } catch { throw new BusinessImportError("Enter a valid website address.", 400); }
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) throw new BusinessImportError("Only public HTTP or HTTPS websites can be imported.", 400);
  if (url.username || url.password) throw new BusinessImportError("Website addresses with embedded credentials cannot be imported.", 400);
  if ((url.protocol === "https:" && url.port && url.port !== "443") || (url.protocol === "http:" && url.port && url.port !== "80")) {
    throw new BusinessImportError("Only standard website ports can be imported.", 400);
  }
  url.hash = "";
  const hostname = stripIpv6Brackets(url.hostname);
  if (!hostname) throw new BusinessImportError("Enter a valid public website.", 400);
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname.endsWith(".lan") || hostname.endsWith(".test") || hostname.endsWith(".invalid")) {
    throw new BusinessImportError("Private or local websites cannot be imported.", 400);
  }
  if (!isIP(hostname) && !hostname.includes(".")) throw new BusinessImportError("Enter a public website hostname.", 400);
  if (isIP(hostname) && isBlockedAddress(hostname)) throw new BusinessImportError("Private or reserved network addresses cannot be imported.", 400);
  return url;
}

async function resolvePublicHost(hostname) {
  const host = stripIpv6Brackets(hostname);
  if (isIP(host)) {
    if (isBlockedAddress(host)) throw new BusinessImportError("Private or reserved network addresses cannot be imported.", 400);
    return { address: host, family: isIP(host) };
  }
  let records;
  try { records = await lookup(host, { all: true, verbatim: true }); }
  catch { throw new BusinessImportError("That website could not be found.", 422); }
  if (!Array.isArray(records) || !records.length) throw new BusinessImportError("That website could not be found.", 422);
  if (records.some(record => isBlockedAddress(record.address))) throw new BusinessImportError("Private or reserved network addresses cannot be imported.", 400);
  return records.find(record => record.family === 4) || records[0];
}

function requestHtmlPage(url) {
  return resolvePublicHost(url.hostname).then(resolved => new Promise((resolve, reject) => {
    const secure = url.protocol === "https:";
    const transport = secure ? https : http;
    const request = transport.request({
      protocol: url.protocol,
      hostname: resolved.address,
      family: resolved.family,
      port: Number(url.port) || (secure ? 443 : 80),
      method: "GET",
      path: `${url.pathname || "/"}${url.search || ""}`,
      servername: secure ? stripIpv6Brackets(url.hostname) : undefined,
      rejectUnauthorized: true,
      headers: {
        Host: url.host,
        Accept: "text/html,application/xhtml+xml;q=0.9",
        "Accept-Encoding": "identity",
        "User-Agent": "BusinessAIWebsiteImporter/1.0"
      }
    }, response => {
      const status = Number(response.statusCode || 0);
      if (status >= 300 && status < 400 && response.headers.location) {
        const next = new URL(response.headers.location, url);
        response.resume();
        resolve({ redirect: next });
        return;
      }
      if (status < 200 || status >= 300) {
        response.resume();
        reject(new BusinessImportError("That website did not return a readable page.", 422));
        return;
      }
      const contentType = String(response.headers["content-type"] || "").toLowerCase();
      if (contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
        response.resume();
        reject(new BusinessImportError("That address is not an HTML website page.", 422));
        return;
      }
      const encoding = String(response.headers["content-encoding"] || "identity").toLowerCase();
      if (encoding !== "identity") {
        response.resume();
        reject(new BusinessImportError("That website uses a response format the importer cannot safely read yet.", 422));
        return;
      }
      const chunks = [];
      let size = 0;
      response.on("data", chunk => {
        size += chunk.length;
        if (size > MAX_HTML_BYTES) {
          request.destroy(new BusinessImportError("That webpage is too large to import safely.", 422));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => resolve({ html: Buffer.concat(chunks).toString("utf8") }));
      response.on("error", reject);
    });
    request.setTimeout(REQUEST_TIMEOUT_MS, () => request.destroy(new BusinessImportError("That website took too long to respond.", 504)));
    request.on("error", error => reject(error instanceof BusinessImportError ? error : new BusinessImportError("That website could not be reached securely.", 502)));
    request.end();
  }));
}

export async function fetchPublicHtml(value) {
  let current = normalizeWebsiteUrl(value);
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    current = normalizeWebsiteUrl(current.toString());
    const result = await requestHtmlPage(current);
    if (result.redirect) {
      if (redirectCount === MAX_REDIRECTS) throw new BusinessImportError("That website redirected too many times.", 422);
      current = normalizeWebsiteUrl(result.redirect.toString());
      continue;
    }
    return { html: result.html, finalUrl: current.toString() };
  }
  throw new BusinessImportError("That website could not be imported.", 422);
}

function decodeEntities(value) {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return String(value || "").replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi, (_, token) => {
    const lower = token.toLowerCase();
    if (lower in named) return named[lower];
    if (lower.startsWith("#x")) return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
    if (lower.startsWith("#")) return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
    return _;
  });
}

function cleanText(value, max = 4000) {
  return decodeEntities(String(value || "").replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, " "))
    .replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/\n\s+/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
}

function attributes(tag) {
  const out = {};
  for (const match of String(tag || "").matchAll(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(["'])(.*?)\2/g)) out[match[1].toLowerCase()] = decodeEntities(match[3]);
  return out;
}

function metaContent(html, keys) {
  const wanted = new Set(keys.map(key => key.toLowerCase()));
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(match[0]);
    const key = String(attrs.property || attrs.name || attrs.itemprop || "").toLowerCase();
    if (wanted.has(key) && attrs.content) return cleanText(attrs.content, 4000);
  }
  return "";
}

function flattenJsonLd(value, out = []) {
  if (Array.isArray(value)) { value.forEach(item => flattenJsonLd(item, out)); return out; }
  if (!value || typeof value !== "object") return out;
  out.push(value);
  if (Array.isArray(value["@graph"])) value["@graph"].forEach(item => flattenJsonLd(item, out));
  return out;
}

function jsonLdObjects(html) {
  const out = [];
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/gi)) {
    const raw = match[2].trim().replace(/^<!--|-->$/g, "");
    if (!raw || raw.length > 300_000) continue;
    try { flattenJsonLd(JSON.parse(raw), out); } catch { /* Ignore invalid third-party JSON-LD. */ }
  }
  return out;
}

function typesOf(node) {
  return (Array.isArray(node?.["@type"]) ? node["@type"] : [node?.["@type"]]).filter(value => typeof value === "string");
}

function businessNode(objects) {
  return objects.find(node => typesOf(node).some(type => BUSINESS_TYPES.has(type) || /Business$/.test(type)))
    || objects.find(node => typesOf(node).includes("Organization"))
    || null;
}

function formatType(node) {
  const types = typesOf(node);
  const specific = types.find(type => !["Organization", "LocalBusiness", "Thing"].includes(type)) || types[0] || "";
  if (!specific) return "";
  return cleanText(specific.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " "), 120);
}

function formatAddress(value) {
  if (typeof value === "string") return cleanText(value, 1000);
  if (!value || typeof value !== "object") return "";
  const country = typeof value.addressCountry === "object" ? value.addressCountry.name : value.addressCountry;
  return [value.streetAddress, value.addressLocality, value.addressRegion, value.postalCode, country].map(item => cleanText(item, 300)).filter(Boolean).join(", ").slice(0, 1000);
}

function listNames(value) {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap(item => {
    if (typeof item === "string") return [cleanText(item, 300)];
    if (item && typeof item === "object") return [cleanText(item.name || item.serviceType || item.description || "", 300)];
    return [];
  }).filter(Boolean);
}

function openingHours(node) {
  const direct = Array.isArray(node?.openingHours) ? node.openingHours : node?.openingHours ? [node.openingHours] : [];
  const rows = direct.map(item => cleanText(item, 160)).filter(Boolean);
  const specs = Array.isArray(node?.openingHoursSpecification) ? node.openingHoursSpecification : node?.openingHoursSpecification ? [node.openingHoursSpecification] : [];
  for (const spec of specs) {
    if (!spec || typeof spec !== "object") continue;
    const days = listNames(spec.dayOfWeek).map(day => day.split("/").pop()).filter(Boolean);
    const span = spec.opens && spec.closes ? `${cleanText(spec.opens, 20)}–${cleanText(spec.closes, 20)}` : "";
    if (days.length && span) rows.push(`${days.join(", ")} ${span}`);
  }
  return [...new Set(rows)].slice(0, 14).join("\n").slice(0, 4000);
}

function collectServices(node) {
  const values = [];
  const add = value => { for (const item of listNames(value)) values.push(item); };
  add(node?.serviceType);
  add(node?.knowsAbout);
  const offers = Array.isArray(node?.makesOffer) ? node.makesOffer : node?.makesOffer ? [node.makesOffer] : [];
  for (const offer of offers) add(offer?.itemOffered || offer?.name || offer?.description);
  const catalogs = Array.isArray(node?.hasOfferCatalog) ? node.hasOfferCatalog : node?.hasOfferCatalog ? [node.hasOfferCatalog] : [];
  for (const catalog of catalogs) {
    add(catalog?.name);
    const items = Array.isArray(catalog?.itemListElement) ? catalog.itemListElement : catalog?.itemListElement ? [catalog.itemListElement] : [];
    for (const item of items) add(item?.itemOffered || item?.name || item?.description);
  }
  const seen = new Set();
  return values.filter(value => {
    const key = value.toLowerCase();
    if (!value || seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 24).join("\n").slice(0, 4000);
}

function listAfterServicesHeading(html) {
  const heading = /<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/gi;
  let match;
  while ((match = heading.exec(html))) {
    const title = cleanText(match[1], 120).toLowerCase();
    if (!/(services|what we do|treatments|solutions|our work)/.test(title)) continue;
    const chunk = html.slice(heading.lastIndex, heading.lastIndex + 8000);
    const nextHeading = chunk.search(/<h[1-4]\b/i);
    const section = nextHeading >= 0 ? chunk.slice(0, nextHeading) : chunk;
    const items = [...section.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(item => cleanText(item[1], 240)).filter(Boolean);
    if (items.length) return [...new Set(items)].slice(0, 20).join("\n").slice(0, 4000);
  }
  return "";
}

function anchorValue(html, scheme, max) {
  const pattern = new RegExp(`href\\s*=\\s*(["'])${scheme}:([^"']+)\\1`, "i");
  const match = html.match(pattern);
  return match ? cleanText(match[2].split("?")[0], max) : "";
}

export function extractBusinessSuggestions(html, sourceUrl = "") {
  const source = String(html || "").slice(0, MAX_HTML_BYTES);
  const objects = jsonLdObjects(source);
  const business = businessNode(objects) || {};
  const titleMatch = source.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const title = cleanText(titleMatch?.[1] || "", 240);
  const ogSiteName = metaContent(source, ["og:site_name", "application-name"]);
  const description = cleanText(business.description, 4000) || metaContent(source, ["description", "og:description"]);
  const phone = cleanText(business.telephone, 120) || anchorValue(source, "tel", 120);
  const email = cleanText(business.email, 320).replace(/^mailto:/i, "") || anchorValue(source, "mailto", 320);
  const address = formatAddress(business.address);
  const serviceAreas = listNames(business.areaServed).join("\n").slice(0, 4000);
  const services = collectServices(business) || listAfterServicesHeading(source);
  const hours = openingHours(business);
  const rawName = cleanText(business.name, 120) || ogSiteName || cleanText(title.split(/\s+[|–—-]\s+/)[0], 120);
  const suggestions = {
    business_name: rawName,
    business_type: formatType(business),
    phone,
    email,
    address,
    opening_hours: hours,
    services,
    description,
    service_areas: serviceAreas,
    website: sourceUrl ? normalizeWebsiteUrl(sourceUrl).toString() : ""
  };
  for (const key of Object.keys(suggestions)) if (!suggestions[key]) delete suggestions[key];
  return { suggestions, found_fields: Object.keys(suggestions).sort() };
}

export async function importBusinessWebsite(value, options = {}) {
  const fetchPage = typeof options.fetchPage === "function" ? options.fetchPage : fetchPublicHtml;
  const result = await fetchPage(value);
  const finalUrl = normalizeWebsiteUrl(result.finalUrl || value).toString();
  const extracted = extractBusinessSuggestions(result.html, finalUrl);
  return { source_url: finalUrl, suggestions: extracted.suggestions, found_fields: extracted.found_fields };
}
