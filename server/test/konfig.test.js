import { test } from 'node:test';
import assert from 'node:assert/strict';
import { begransningsgranser, tillatnaVardnamn, tolkaTrustProxy } from '../konfig.js';

test('TRUST_PROXY: tomt ger ingen proxy, heltal godtas', () => {
  assert.equal(tolkaTrustProxy(undefined), undefined);
  assert.equal(tolkaTrustProxy(''), undefined);
  assert.equal(tolkaTrustProxy('1'), 1);
  assert.equal(tolkaTrustProxy('2'), 2);
});

test('TRUST_PROXY: "true" och andra värden som inte är heltal nekas med svenskt fel', () => {
  for (const varde of ['true', 'false', '0', '-1', '1.5', '1 ', '10.0.0.1']) {
    assert.throws(() => tolkaTrustProxy(varde), /TRUST_PROXY måste vara ett heltal/, varde);
  }
});

test('begränsningsgränser: standard 20 per minut och 300 per timme', () => {
  assert.deepEqual(begransningsgranser({}), [
    { max: 20, fonsterMs: 60_000 },
    { max: 300, fonsterMs: 3_600_000 },
  ]);
});

test('begränsningsgränser: MAX_SKRIV_PER_MINUT och MAX_SKRIV_PER_TIMME kan ändras', () => {
  const [minut, timme] = begransningsgranser({ MAX_SKRIV_PER_MINUT: '40', MAX_SKRIV_PER_TIMME: '500' });
  assert.equal(minut.max, 40);
  assert.equal(timme.max, 500);
});

test('begränsningsgränser: ogiltiga värden ger tydligt fel', () => {
  assert.throws(() => begransningsgranser({ MAX_SKRIV_PER_TIMME: 'många' }), /MAX_SKRIV_PER_TIMME måste vara ett positivt heltal/);
  assert.throws(() => begransningsgranser({ MAX_SKRIV_PER_MINUT: '0' }), /MAX_SKRIV_PER_MINUT måste vara ett positivt heltal/);
});

test('tillåtna värdnamn: localhost, 127.0.0.1 och ::1, plus HOST om den sätts', () => {
  assert.deepEqual(tillatnaVardnamn(undefined), ['localhost', '127.0.0.1', '::1']);
  assert.deepEqual(tillatnaVardnamn('192.168.1.5'), ['localhost', '127.0.0.1', '::1', '192.168.1.5']);
});
