import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");

test("owner settings expose smart links and downloadable QR codes", async () => {
  const html = await read("index.html");
  assert.match(html, /id="smartLinksCard"/);
  assert.match(html, /QR code &amp; smart link/);
  assert.match(html, /id="smartCustomerLink"/);
  assert.match(html, /id="smartCustomerQr"/);
  assert.match(html, /downloadCustomerQr/);
  assert.match(html, /publicEnquiryUrl\(slug,'share'\)/);
  assert.match(html, /qrImageUrl/);
});

test("website widget, directory, smart links and QR carry explicit safe source tags", async () => {
  const html = await read("index.html");
  const widget = await read("widget.js");
  assert.match(html, /PUBLIC_ENQUIRY_SOURCES/);
  assert.match(html, /website_widget/);
  assert.match(html, /directory/);
  assert.match(html, /qr/);
  assert.match(html, /share/);
  assert.match(widget, /searchParams\.set\('source', 'website_widget'\)/);
});

test("public enquiry stores source labels without accepting tenant identifiers from the browser", async () => {
  const enquiry = await read("api/enquiry.js");
  assert.match(enquiry, /allowedSources/);
  assert.match(enquiry, /enquirySourceLabel/);
  assert.match(enquiry, /Source: " \+ enquirySourceLabel/);
  assert.match(enquiry, /enquiry\.source_captured/);
  assert.match(enquiry, /public_slug: publicBusiness\.slug/);
  assert.match(enquiry, /"business_id", "tenant_id"/);
});

test("QR endpoint verifies a public business slug and generates only its customer URL", async () => {
  const handler = await read("lib/qr-code-handler.js");
  assert.match(handler, /normalisePublicBusinessSlug/);
  assert.match(handler, /resolvePublicBusinessRoute/);
  assert.match(handler, /searchParams\.set\("source", "qr"\)/);
  assert.match(handler, /QRCode\.toBuffer/);
  assert.match(handler, /QRCode\.toString/);
  assert.doesNotMatch(handler, /req\.query\?\.url|req\.body/);
});

test("QR endpoint stays inside the shared dispatcher", async () => {
  const operations = await read("api/operations.js");
  const vercel = await read("vercel.json");
  assert.match(operations, /"qr-code": qrCodeHandler/);
  assert.match(vercel, /"source": "\/api\/qr-code"/);
  assert.match(vercel, /operation=qr-code/);
});
