import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerCookies, cookieSessao, cookieApagado } from '../server/cookies.js';

test('lerCookies', () => {
  assert.deepEqual(lerCookies(''), {});
  assert.deepEqual(lerCookies(undefined), {});
  assert.deepEqual(lerCookies('a=1; sessao=x%20y'), { a: '1', sessao: 'x y' });
  assert.deepEqual(lerCookies('sessao=%E0'), { sessao: '%E0' }); // malformado: fica como veio, sem lançar
  assert.deepEqual(lerCookies('a=b=c'), { a: 'b=c' });           // só o primeiro "=" separa
});

test('cookieSessao tem HttpOnly, SameSite=Lax, Path=/ e 30 dias', () => {
  const cookie = cookieSessao('abc');

  assert.ok(cookie.startsWith('sessao=abc;'));
  assert.ok(cookie.includes('HttpOnly'));
  assert.ok(cookie.includes('SameSite=Lax'));
  assert.ok(cookie.includes('Path=/'));
  assert.ok(cookie.includes('Max-Age=2592000'));
});

test('cookieApagado expira na hora', () => {
  assert.ok(cookieApagado().startsWith('sessao=;'));
  assert.ok(cookieApagado().includes('Max-Age=0'));
});
