import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escaparHtml, urlImagem, formatarNota, formatarDuracao, cortarTexto } from '../public/js/formatar.js';

test('escaparHtml', () => {
  assert.equal(escaparHtml(`<script>"&'`), '&lt;script&gt;&quot;&amp;&#39;');
  assert.equal(escaparHtml(null), '');
  assert.equal(escaparHtml(undefined), '');
  assert.equal(escaparHtml(1999), '1999');
});

test('urlImagem', () => {
  assert.equal(urlImagem('/a.jpg'), 'https://image.tmdb.org/t/p/w342/a.jpg');
  assert.equal(urlImagem('/a.jpg', 'w92'), 'https://image.tmdb.org/t/p/w92/a.jpg');
  assert.equal(urlImagem(null), null);
});

test('formatarNota', () => {
  assert.equal(formatarNota(8.4), '8,4');
  assert.equal(formatarNota(7), '7,0');
  assert.equal(formatarNota(null), '–');
});

test('formatarDuracao', () => {
  assert.equal(formatarDuracao(139), '2h 19min');
  assert.equal(formatarDuracao(45), '45min');
  assert.equal(formatarDuracao(120), '2h');
  assert.equal(formatarDuracao(null), '');
});

test('cortarTexto', () => {
  assert.deepEqual(cortarTexto('abc def', 3), { curto: 'abc…', cortado: true });
  assert.deepEqual(cortarTexto('abc', 10), { curto: 'abc', cortado: false });
  assert.deepEqual(cortarTexto('abc', 3), { curto: 'abc', cortado: false });
});
