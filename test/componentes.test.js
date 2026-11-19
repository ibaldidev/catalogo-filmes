import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cartaoFilme, listaVazia } from '../public/js/componentes.js';

test('cartaoFilme completo', () => {
  const html = cartaoFilme({ id: 550, titulo: 'Clube da Luta', ano: 1999, poster: '/a.jpg', nota: 8.4, votos: 1 });

  assert.ok(html.includes('href="filme.html?id=550"'));
  assert.ok(html.includes('Clube da Luta'));
  assert.ok(html.includes('1999'));
  assert.ok(html.includes('8,4'));
  assert.ok(html.includes('https://image.tmdb.org/t/p/w342/a.jpg'));
  assert.ok(!html.includes('sem-poster'));
});

test('cartaoFilme com campos vazios e HTML no título', () => {
  const html = cartaoFilme({ id: 1, titulo: '<b>X</b>', ano: null, poster: null, nota: null, votos: 0 });

  assert.ok(html.includes('&lt;b&gt;X'));
  assert.ok(html.includes('sem-poster'));
  assert.ok(!html.includes('<b>'));
  assert.ok(!html.includes('null'));
  assert.ok(!html.includes('undefined'));
});

test('listaVazia escapa a mensagem', () => {
  const html = listaVazia('<i>nada</i>');

  assert.ok(html.includes('&lt;i&gt;nada'));
  assert.ok(!html.includes('<i>'));
});
