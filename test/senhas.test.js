import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gerarHashSenha, conferirSenha } from '../server/senhas.js';

test('hash não contém a senha e começa com scrypt$', () => {
  const hash = gerarHashSenha('minha-senha-123');

  assert.ok(hash.startsWith('scrypt$'));
  assert.ok(!hash.includes('minha-senha-123'));
});

test('mesma senha gera hashes diferentes (sal)', () => {
  assert.notEqual(gerarHashSenha('12345678'), gerarHashSenha('12345678'));
});

test('conferirSenha: certa → true, errada → false', () => {
  const hash = gerarHashSenha('12345678');

  assert.equal(conferirSenha('12345678', hash), true);
  assert.equal(conferirSenha('12345679', hash), false);
  assert.equal(conferirSenha('', hash), false);
});

test('conferirSenha com texto guardado malformado → false', () => {
  for (const guardado of ['lixo', '', 'scrypt$zz$zz', 'scrypt$00', null, undefined]) {
    assert.equal(conferirSenha('12345678', guardado), false, String(guardado));
  }
});
