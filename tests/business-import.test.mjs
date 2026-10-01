import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  BusinessImportError,
  extractBusinessSuggestions,
  importBusinessWebsite,
  isBlockedAddress,
  normalizeWebsiteUrl
} from "../lib/business-import.js";

test("website import accepts public websites and rejects local, private and unusual endpoints", () => {
  assert.equal(normalizeWebsiteUrl("example.com/about").toString(), "https://example.com/about");
  assert.throws(() => normalizeWebsiteUrl("ftp://example.com"), BusinessImportError);
  assert.throws(() => normalizeWebsiteUrl("http://localhost"), /Private or local/);
  assert.throws(() => normalizeWebsiteUrl("http://127.0.0.1"), /Private or reserved/);
  assert.throws(() => normalizeWebsiteUrl("http://10.2.3.4"), /Private or reserved/);
  assert.throws(() => normalizeWebsiteUrl("http://[::1]"), /Private or reserved/);
  assert.throws(() => normalizeWebsiteUrl("https://example.com:8443"), /standard website ports/);
  assert.equal(isBlockedAddress("192.168.1.20"), true);
  assert.equal(isBlockedAddress("169.254.10.1"), true);
  assert.equal(isBlockedAddress("203.0.113.2"), true);
  assert.equal(isBlockedAddress("8.8.8.8"), false);
});

test("website import extracts reviewable business suggestions from LocalBusiness JSON-LD", () => {
  const html = `<!doctype html><html><head>
  <title>Fallback title</title>
  <meta name="description" content="Fallback description">
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Electrician",
    name: "QA North East Electrical",
    description: "Local electrical testing and maintenance.",
    telephone: "01429 000000",
    email: "hello@example.co.uk",
    address: { streetAddress: "1 Test Street", addressLocality: "Hartlepool", postalCode: "TS00 0AA", addressCountry: "GB" },
    areaServed: [{ name: "Hartlepool" }, { name: "Teesside" }],
    openingHours: ["Mo-Fr 08:00-17:00", "Sa 09:00-13:00"],
    makesOffer: [
      { itemOffered: { "@type": "Service", name: "Electrical inspections" } },
      { itemOffered: { "@type": "Service", name: "Fault finding" } }
    ]
  })}</script></head><body></body></html>`;
  const result = extractBusinessSuggestions(html, "https://example.co.uk/");
  assert.equal(result.suggestions.business_name, "QA North East Electrical");
  assert.equal(result.suggestions.business_type, "Electrician");
  assert.equal(result.suggestions.phone, "01429 000000");
  assert.equal(result.suggestions.email, "hello@example.co.uk");
  assert.equal(result.suggestions.address, "1 Test Street, Hartlepool, TS00 0AA, GB");
  assert.equal(result.suggestions.opening_hours, "Mo-Fr 08:00-17:00\nSa 09:00-13:00");
  assert.match(result.suggestions.services, /Electrical inspections/);
  assert.match(result.suggestions.services, /Fault finding/);
  assert.equal(result.suggestions.service_areas, "Hartlepool\nTeesside");
  assert.equal(result.suggestions.website, "https://example.co.uk/");
});

test("website import has safe metadata fallbacks and can discover a services list", () => {
  const html = `<!doctype html><html><head><title>QA Garden Care | Home</title><meta property="og:site_name" content="QA Garden Care"><meta name="description" content="Garden maintenance around Teesside"></head><body><a href="tel:01429000111">Call</a><a href="mailto:team@example.co.uk">Email</a><h2>Our services</h2><ul><li>Lawn care</li><li>Hedge trimming</li></ul><h2>Contact</h2></body></html>`;
  const result = extractBusinessSuggestions(html, "https://garden.example.co.uk/");
  assert.equal(result.suggestions.business_name, "QA Garden Care");
  assert.equal(result.suggestions.description, "Garden maintenance around Teesside");
  assert.equal(result.suggestions.phone, "01429000111");
  assert.equal(result.suggestions.email, "team@example.co.uk");
  assert.equal(result.suggestions.services, "Lawn care\nHedge trimming");
});

test("website import returns suggestions only and supports an injected safe page fetcher", async () => {
  let called = 0;
  const result = await importBusinessWebsite("https://example.co.uk", {
    fetchPage: async value => {
      called += 1;
      assert.equal(value, "https://example.co.uk");
      return { finalUrl: "https://example.co.uk/home", html: '<meta property="og:site_name" content="QA Example"><meta name="description" content="Test business">' };
    }
  });
  assert.equal(called, 1);
  assert.deepEqual(result.suggestions, { business_name: "QA Example", description: "Test business", website: "https://example.co.uk/home" });
  assert.deepEqual(result.found_fields, ["business_name", "description", "website"]);
});

test("website import is wired as an admin-only preview and UI says suggestions are reviewed before saving", async () => {
  const api = await readFile(new URL("../api/business-configuration.js", import.meta.url), "utf8");
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(api, /req\.method === "GET" \? await requireBusinessMember\(req\) : await requireBusinessAdmin\(req\)/);
  assert.match(api, /body\.action !== "import_website"/);
  assert.match(api, /configuration\.import\.preview/);
  assert.match(html, /id="onboardingWebsiteImport"/);
  assert.match(html, /id="settingsWebsiteImport"/);
  assert.match(html, /applyWebsiteImportSuggestions/);
  assert.match(html, /Review everything before saving/);
  assert.match(html, /Existing business information is never replaced/);
});
