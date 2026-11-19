import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cartaoFilme, listaVazia, secaoOndeAssistir, cartaoResenha } from '../public/js/componentes.js';

const semNada = { disponivel: false, link: null, assinatura: [], gratis: [], anuncios: [], aluguel: [], compra: [] };

test('onde assistir indisponível', () => {
  const html = secaoOndeAssistir(semNada);

  assert.ok(html.includes('Não disponível em nenhum streaming no Brasil no momento.'));
  assert.ok(html.includes('Dados de streaming: JustWatch'));
  assert.ok(!html.includes('Ver opções'));
});

test('onde assistir com grupos', () => {
  const html = secaoOndeAssistir({
    ...semNada,
    disponivel: true,
    link: 'https://www.themoviedb.org/movie/550/watch?locale=BR',
    assinatura: [{ id: 8, nome: 'Netflix', logo: '/n.jpg' }],
    aluguel: [{ id: 2, nome: 'Apple TV', logo: null }],
  });

  assert.ok(html.includes('Incluso na assinatura'));
  assert.ok(html.includes('Netflix'));
  assert.ok(html.includes('https://image.tmdb.org/t/p/w92/n.jpg'));
  assert.ok(html.includes('Aluguel'));
  assert.ok(html.includes('Apple TV'));
  assert.ok(!html.includes('Compra'));
  assert.ok(!html.includes('Grátis'));
  assert.ok(html.includes('Dados de streaming: JustWatch'));
  assert.ok(html.includes('href="https://www.themoviedb.org/movie/550/watch?locale=BR"'));
  assert.ok(!html.includes('Não disponível'));
  assert.ok(!html.includes('null'));
});

test('onde assistir grátis e com anúncios têm títulos próprios', () => {
  const html = secaoOndeAssistir({
    ...semNada,
    disponivel: true,
    gratis: [{ id: 1, nome: 'TV Livre', logo: null }],
    anuncios: [{ id: 2, nome: 'Pluto TV', logo: null }],
  });

  assert.ok(html.includes('>Grátis<'));
  assert.ok(html.includes('Grátis com anúncios'));
});

const resenhaBase = { id: 'r1', autor: 'Ana', texto: 'Ótimo filme.', idioma: 'pt-BR', nota: 9, data: '2020-01-15T12:00:00Z' };

test('resenha em português, curta e com nota', () => {
  const html = cartaoResenha(resenhaBase);

  assert.ok(html.includes('Ana'));
  assert.ok(html.includes('Ótimo filme.'));
  assert.ok(html.includes('15/01/2020'));
  assert.ok(html.includes('9'));
  assert.ok(!html.includes('Em inglês'));
  assert.ok(!html.includes('Ler mais'));
});

test('resenha em inglês e longa', () => {
  const html = cartaoResenha({ ...resenhaBase, idioma: 'en-US', texto: 'a'.repeat(700) });

  assert.ok(html.includes('Em inglês'));
  assert.ok(html.includes('Ler mais'));
  assert.ok(html.includes('data-resenha-id="r1"'));
  assert.ok(!html.includes('a'.repeat(601)));
});

test('resenha escapa HTML', () => {
  const html = cartaoResenha({ ...resenhaBase, autor: '<img src=x onerror=alert(1)>', texto: '<script>x</script>' });

  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes('<script>'));
});

test('resenha sem nota e com data inválida', () => {
  const html = cartaoResenha({ ...resenhaBase, nota: null, data: 'xyz' });

  assert.ok(!html.includes('null'));
  assert.ok(!html.includes('Invalid Date'));
});

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
