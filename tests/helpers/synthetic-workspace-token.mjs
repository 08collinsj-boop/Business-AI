// Unsigned test data, accepted only by tests' mocked Auth verifier.
// Never a provider-issued session or evidence of live MFA acceptance.
export const syntheticAal2Token = (identity = 'fixture') =>
  'synthetic.' + Buffer.from(JSON.stringify({aal:'aal2', fixture:identity})).toString('base64url') + '.unsigned';
