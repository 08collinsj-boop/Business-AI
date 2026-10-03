import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('security centre exposes incident controls, MFA and security activity', async () => {
  const [script, styles, loader] = await Promise.all([
    readFile(new URL('../assets/security-center.js', import.meta.url), 'utf8'),
    readFile(new URL('../assets/security-center.css', import.meta.url), 'utf8'),
    readFile(new URL('../assets/premium-ui.js', import.meta.url), 'utf8')
  ]);
  assert.match(loader, /security-center\.css/);
  assert.match(loader, /security-center\.js/);
  assert.match(script, /\/api\/incident-controls/);
  assert.match(script, /\/api\/audit-log/);
  assert.match(script, /getAuthenticatorAssuranceLevel/);
  assert.match(script, /mfa\.enroll/);
  assert.match(script, /mfa\.verify/);
  assert.match(script, /mfa\.unenroll/);
  const removeFactor = script.indexOf('async function removeMfaFactor');
  const aal2BeforeRemove = script.indexOf('ensureAal2ForAction()', removeFactor);
  const unenroll = script.indexOf('mfa.unenroll', removeFactor);
  assert.ok(removeFactor >= 0 && aal2BeforeRemove > removeFactor && unenroll > aal2BeforeRemove, 'verified MFA removal must require AAL2 first');
  assert.match(script, /MFA_REQUIRED/);
  assert.match(script, /securityPauseBanner/);
  assert.match(styles, /security-mfa-gate/);
  assert.match(styles, /security-pause-banner/);
});
