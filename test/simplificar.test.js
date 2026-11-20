import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  simplificarResumo,
  simplificarOndeAssistir,
  simplificarResenha,
  juntarResenhas,
  simplificarDetalhe,
  ordenarProvedores,
} from '../server/simplificar.js';

// Exemplo de um filme como o TMDB devolve na lista do /discover e do /search.
const filmeDoTmdb = {
  adult: false,
  backdrop_path: '/fundo.jpg',
  genre_ids: [18],
  id: 550,
  original_language: 'en',
  original_title: 'Fight Club',
  overview: 'Um homem deprimido...',
  popularity: 61.4,
  poster_path: '/a.jpg',
  release_date: '1999-10-15',
  title: 'Clube da Luta',
  video: false,
  vote_average: 8.438,
  vote_count: 30000,
};

test('resumo completo', () => {
  assert.deepEqual(simplificarResumo(filmeDoTmdb), {
    id: 550,
    titulo: 'Clube da Luta',
    ano: 1999,
    poster: '/a.jpg',
    fundo: '/fundo.jpg',
    nota: 8.4,
    votos: 30000,
  });
});

test('resumo sem data, sem pôster e sem votos', () => {
  const vazio = { ...filmeDoTmdb, release_date: '', poster_path: null, vote_average: 0, vote_count: 0 };
  const resumo = simplificarResumo(vazio);

  assert.equal(resumo.ano, null);
  assert.equal(resumo.poster, null);
  assert.equal(resumo.nota, null);
  assert.equal(resumo.votos, 0);
});

test('onde assistir agrupa por tipo', () => {
  const regiaoBR = {
    link: 'https://www.themoviedb.org/movie/550/watch?locale=BR',
    flatrate: [{ logo_path: '/n.jpg', provider_id: 8, provider_name: 'Netflix', display_priority: 1 }],
    rent: [{ logo_path: '/apple.jpg', provider_id: 2, provider_name: 'Apple TV', display_priority: 4 }],
  };

  assert.deepEqual(simplificarOndeAssistir(regiaoBR), {
    disponivel: true,
    link: 'https://www.themoviedb.org/movie/550/watch?locale=BR',
    assinatura: [{ id: 8, nome: 'Netflix', logo: '/n.jpg' }],
    gratis: [],
    anuncios: [],
    aluguel: [{ id: 2, nome: 'Apple TV', logo: '/apple.jpg' }],
    compra: [],
  });
});

test('onde assistir sem dados do Brasil', () => {
  assert.deepEqual(simplificarOndeAssistir(undefined), {
    disponivel: false,
    link: null,
    assinatura: [],
    gratis: [],
    anuncios: [],
    aluguel: [],
    compra: [],
  });
});

test('onde assistir com tipos grátis e com anúncios', () => {
  const regiaoBR = {
    link: 'L',
    free: [{ logo_path: '/f.jpg', provider_id: 10, provider_name: 'Grátis TV' }],
    ads: [{ logo_path: '/p.jpg', provider_id: 11, provider_name: 'Pluto TV' }],
  };
  const onde = simplificarOndeAssistir(regiaoBR);

  assert.deepEqual(onde.gratis, [{ id: 10, nome: 'Grátis TV', logo: '/f.jpg' }]);
  assert.deepEqual(onde.anuncios, [{ id: 11, nome: 'Pluto TV', logo: '/p.jpg' }]);
  assert.equal(onde.disponivel, true);
});

// Detalhe como o TMDB devolve em /movie/{id}?append_to_response=watch/providers
const detalheDoTmdb = {
  ...filmeDoTmdb,
  runtime: 139,
  genres: [{ id: 18, name: 'Drama' }, { id: 53, name: 'Thriller' }],
  'watch/providers': {
    results: {
      BR: { link: 'L', flatrate: [{ logo_path: '/n.jpg', provider_id: 8, provider_name: 'Netflix' }] },
      US: { link: 'LUS', buy: [{ logo_path: '/x.jpg', provider_id: 3, provider_name: 'Google' }] },
    },
  },
};

test('detalhe completo', () => {
  const resenhas = [{ id: 'r1', autor: 'Ana', texto: 'Ótimo', idioma: 'pt-BR', nota: 9, data: '2020-01-01T00:00:00Z' }];
  const detalhe = simplificarDetalhe(detalheDoTmdb, resenhas);

  assert.equal(detalhe.id, 550);
  assert.equal(detalhe.titulo, 'Clube da Luta');
  assert.equal(detalhe.ano, 1999);
  assert.equal(detalhe.duracaoMin, 139);
  assert.deepEqual(detalhe.generos, ['Drama', 'Thriller']);
  assert.equal(detalhe.sinopse, 'Um homem deprimido...');
  assert.equal(detalhe.nota, 8.4);
  assert.equal(detalhe.votos, 30000);
  assert.deepEqual(detalhe.ondeAssistir.assinatura, [{ id: 8, nome: 'Netflix', logo: '/n.jpg' }]);
  assert.deepEqual(detalhe.ondeAssistir.compra, []); // a compra dos EUA não entra
  assert.deepEqual(detalhe.resenhas, resenhas);
});

test('detalhe com campos vazios', () => {
  const vazio = {
    ...detalheDoTmdb,
    runtime: 0,
    overview: '',
    genres: [],
    'watch/providers': { results: { US: { link: 'LUS' } } },
  };
  const detalhe = simplificarDetalhe(vazio, []);

  assert.equal(detalhe.duracaoMin, null);
  assert.equal(detalhe.sinopse, null);
  assert.deepEqual(detalhe.generos, []);
  assert.equal(detalhe.ondeAssistir.disponivel, false);
  assert.deepEqual(detalhe.resenhas, []);
});

test('resenha', () => {
  const resenhaDoTmdb = {
    author: 'Ana',
    author_details: { name: '', username: 'ana', avatar_path: null, rating: null },
    content: 'Ótimo',
    created_at: '2020-01-01T00:00:00Z',
    id: 'r1',
    updated_at: '2020-01-02T00:00:00Z',
    url: 'https://www.themoviedb.org/review/r1',
  };

  assert.deepEqual(simplificarResenha(resenhaDoTmdb, 'pt-BR'), {
    id: 'r1',
    autor: 'Ana',
    texto: 'Ótimo',
    idioma: 'pt-BR',
    nota: null,
    data: '2020-01-01T00:00:00Z',
  });
});

test('resenha com nota', () => {
  const resenhaDoTmdb = {
    author: 'Bob', author_details: { rating: 8 }, content: 'Good', created_at: '2021-05-05T00:00:00Z', id: 'r2',
  };

  assert.equal(simplificarResenha(resenhaDoTmdb, 'en-US').nota, 8);
});

test('juntarResenhas sem repetir', () => {
  const r1pt = { id: 'r1', autor: 'Ana', texto: 'a', idioma: 'pt-BR', nota: null, data: 'd' };
  const r1en = { id: 'r1', autor: 'Ana', texto: 'a', idioma: 'en-US', nota: null, data: 'd' };
  const r2en = { id: 'r2', autor: 'Bob', texto: 'b', idioma: 'en-US', nota: null, data: 'd' };

  const juntas = juntarResenhas([r1pt], [r1en, r2en]);

  assert.deepEqual(juntas.map((r) => r.id), ['r1', 'r2']);
  assert.equal(juntas[0].idioma, 'pt-BR');
});

test('ordenarProvedores: principais primeiro, resto em ordem alfabética', () => {
  const lista = [
    { id: 5, nome: 'Zeta', logo: null },
    { id: 119, nome: 'Prime Video', logo: null },
    { id: 3, nome: 'Alfa', logo: null },
    { id: 8, nome: 'Netflix', logo: null },
    { id: 4, nome: 'Éden', logo: null },
  ];

  const ordenada = ordenarProvedores(lista, [8, 119]);

  assert.deepEqual(ordenada.map((p) => p.id), [8, 119, 3, 4, 5]);
});

test('resenha sem texto vira texto vazio (e não quebra a página)', () => {
  const resenha = simplificarResenha({ id: 'r9', author: 'Ana', content: null, created_at: 'd' }, 'en-US');

  assert.equal(resenha.texto, '');
});
