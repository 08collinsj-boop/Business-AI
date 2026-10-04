import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const [showcase, index, premiumUi] = await Promise.all([
  readFile(new URL('../assets/final-showcase.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../assets/premium-ui.js', import.meta.url), 'utf8')
]);

function extractDialHelper(source, name) {
  const start = source.indexOf(`function ${name}(value){`);
  assert.notEqual(start, -1, `${name} helper should exist`);
  const bodyStart = start + `function ${name}(value){`.length;
  const bodyEnd = source.indexOf('\n}', bodyStart);
  assert.notEqual(bodyEnd, -1, `${name} helper should close`);
  return new Function('value', source.slice(bodyStart, bodyEnd));
}

test('UK customer phone links use unambiguous dial targets', () => {
  const ownerDial = extractDialHelper(showcase, 'finalDialNumber');
  const publicDial = extractDialHelper(index, 'publicDialNumber');
  for (const dial of [ownerDial, publicDial]) {
    assert.equal(dial('07849243242'), '+447849243242');
    assert.equal(dial('+44 7849 243242'), '+447849243242');
    assert.equal(dial('0044 7849 243242'), '+447849243242');
    assert.equal(dial('020 7123 4567'), '+442071234567');
    assert.equal(dial('+1 (212) 555-0100'), '+12125550100');
  }
});

test('all clickable phone actions use the normalised target', () => {
  assert.match(showcase, /window\.finalCall=[\s\S]*?finalDialNumber\(x\?\.phone\)[\s\S]*?location\.href='tel:'\+dial/);
  assert.match(showcase, /window\.finalMessage=[\s\S]*?finalDialNumber\(x\?\.phone\)[\s\S]*?location\.href='sms:'\+dial/);
  assert.match(showcase, /window\.finalActionCall=[\s\S]*?finalDialNumber\(l\?\.phone\)[\s\S]*?location\.href='tel:'\+dial/);
  assert.match(index, /const dial=publicDialNumber\(phone\);if\(dial\)window\.location\.href='tel:'\+dial/);
  assert.match(premiumUi, /final-showcase\.js\?v=20261004-phone-links-1/);
});
