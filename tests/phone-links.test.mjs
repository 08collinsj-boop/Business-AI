import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const [finalShowcase, index, premiumUi, enquiry] = await Promise.all([
  readFile(new URL('../assets/final-showcase.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../assets/premium-ui.js', import.meta.url), 'utf8'),
  readFile(new URL('../api/enquiry.js', import.meta.url), 'utf8')
]);

test('UK customer phone links use unambiguous +44 dial targets', () => {
  assert.match(finalShowcase, /normaliseDialNumber/);
  assert.match(finalShowcase, /return '\+44'\+dial\.slice\(1\)/);
  assert.match(finalShowcase, /location\.href='tel:'\+dial/);
  assert.match(finalShowcase, /location\.href='sms:'\+dial/);
  assert.match(index, /normalisePublicDialNumber/);
  assert.match(index, /window\.location\.href='tel:'\+dial/);
  assert.match(premiumUi, /final-showcase\.js\?v=20261004-phone-nav-2/);
});

test('documented UK mobile example maps to the intended international dial string', () => {
  const normalise = value => {
    let dial=String(value||'').trim().replace(/[^+\d]/g,'');
    if(!dial)return '';
    if(/^0044\d{10}$/.test(dial))return '+44'+dial.slice(4);
    if(/^44\d{10}$/.test(dial))return '+44'+dial.slice(2);
    if(/^\+440\d+$/.test(dial))dial='+44'+dial.slice(4);
    if(/^\+44\d{10}$/.test(dial))return dial;
    if(/^0[1-9]\d{8,10}$/.test(dial))return '+44'+dial.slice(1);
    if(/^00/.test(dial))return '';
    return /^\+[1-9]\d{7,14}$/.test(dial)?dial:'';
  };
  assert.equal(normalise('07849243242'), '+447849243242');
  assert.equal(normalise('+44 7849 243242'), '+447849243242');
  assert.equal(normalise('0044 7849 243242'), '+447849243242');
  assert.equal(normalise('00073808992'), '');
});

test('customer transcript phone wins over AI-extracted phone and malformed 00 values are not persisted', () => {
  assert.match(enquiry, /phone:\s*detectedPhone \|\|\s*normalisePhone\(lead\.phone\)/);
  assert.match(enquiry, /digits\.startsWith\("0044"\)/);
  assert.match(enquiry, /digits\.startsWith\("00"\)\) return null/);
  assert.match(enquiry, /conversation\.filter\(item => item\.role === "user"\)/);
});

test('legacy malformed lead phone can recover a valid UK number from enquiry details', () => {
  assert.match(finalShowcase, /const leadPhoneNumber=value=>normaliseUkDisplayNumber\(value\?\.phone\)\|\|findUkPhoneInText/);
  assert.match(finalShowcase, /phone=leadPhoneNumber\(x\)/);
  assert.match(finalShowcase, /☎ \$\{E\(phone\)\}/);
  assert.match(finalShowcase, /if\(\/\^00\/\.test\(dial\)\)return ''/);
});
