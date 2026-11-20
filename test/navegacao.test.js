import { test } from 'node:test';
import assert from 'node:assert/strict';
import { destinoSeguro, linkEntrar, destinoDe } from '../public/js/navegacao.js';

test('destinoSeguro aceita páginas nossas', () => {
  for (const destino of ['filme.html?id=550', 'busca.html?q=a%20b', 'busca.html?q=a+b', 'index.html']) {
    assert.equal(destinoSeguro(destino), destino);
  }
});

test('destinoSeguro recusa o resto', () => {
  const perigosos = [
    'https://mal.com', '//mal.com', 'javascript:alert(1)', '', null, undefined, '/etc',
    'filme.html#x', 'entrar.html', 'filme.html.mal.com', ' filme.html', 'FILME.HTML',
  ];
  for (const destino of perigosos) {
    assert.equal(destinoSeguro(destino), 'index.html', String(destino));
  }
});

test('linkEntrar codifica o destino', () => {
  assert.equal(linkEntrar('filme.html?id=550'), 'entrar.html?volta=filme.html%3Fid%3D550');
});

test('destinoDe monta "página + busca" a partir do endereço atual', () => {
  assert.equal(destinoDe('/filme.html', '?id=550'), 'filme.html?id=550');
  assert.equal(destinoDe('/', ''), 'index.html');
  assert.equal(destinoDe('/busca.html', '?q=a+b'), 'busca.html?q=a+b');
});
