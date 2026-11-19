import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarApp } from '../server/app.js';
import { ErroTmdb } from '../server/tmdb.js';
import { iniciarServidor } from './ajudantes.js';

// Dados no formato que o TMDB devolve.
const filmeTmdb = {
  id: 550, title: 'Clube da Luta', release_date: '1999-10-15', poster_path: '/a.jpg',
  vote_average: 8.438, vote_count: 30000, overview: 'Sinopse', genre_ids: [18],
};
const listaTmdb = { page: 2, total_pages: 9000, total_results: 180000, results: [filmeTmdb] };
const detalheTmdb = {
  ...filmeTmdb, runtime: 139, genres: [{ id: 18, name: 'Drama' }],
  'watch/providers': { results: { BR: { link: 'L', flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg' }] } } },
};
const resenhasPt = { results: [{ id: 'r1', author: 'Ana', content: 'Ótimo', created_at: 'd', author_details: { rating: 9 } }] };
const resenhasEn = { results: [{ id: 'r2', author: 'Bob', content: 'Great', created_at: 'd', author_details: { rating: null } }] };
const provedoresTmdb = {
  results: [
    { provider_id: 2, provider_name: 'Apple TV', logo_path: '/a.jpg' },
    { provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg' },
  ],
};

// TMDB falso: anota cada chamada e devolve os dados acima.
// Passe "falhas" para fazer uma função lançar um erro.
function criarTmdbFalso(falhas = {}) {
  const chamadas = [];
  function registrar(nome, resposta) {
    return async (...args) => {
      chamadas.push({ nome, args });
      if (falhas[nome]) throw falhas[nome];
      return typeof resposta === 'function' ? resposta(...args) : resposta;
    };
  }
  return {
    chamadas,
    descobrir: registrar('descobrir', listaTmdb),
    buscar: registrar('buscar', listaTmdb),
    detalhes: registrar('detalhes', detalheTmdb),
    resenhas: registrar('resenhas', (id, idioma) => (idioma === 'pt-BR' ? resenhasPt : resenhasEn)),
    provedores: registrar('provedores', provedoresTmdb),
  };
}

// Liga o servidor com o TMDB falso, faz um pedido e desliga.
async function pedir(caminho, tmdb = criarTmdbFalso()) {
  const servidor = await iniciarServidor(criarApp({ tmdb }));
  try {
    const resposta = await fetch(servidor.url + caminho);
    return { status: resposta.status, corpo: await resposta.json(), tmdb };
  } finally {
    await servidor.fechar();
  }
}

test('descobrir repassa filtros e simplifica', async () => {
  const { status, corpo, tmdb } = await pedir('/api/descobrir?ordem=populares&provedores=8,119&pagina=2');

  assert.equal(status, 200);
  assert.deepEqual(tmdb.chamadas[0], { nome: 'descobrir', args: [{ ordem: 'populares', provedores: [8, 119], pagina: 2 }] });
  assert.equal(corpo.pagina, 2);
  assert.equal(corpo.totalPaginas, 500); // o TMDB diz 9000, mas só vai até 500
  assert.equal(corpo.filmes[0].titulo, 'Clube da Luta');
  assert.equal(corpo.filmes[0].nota, 8.4);
});

test('descobrir sem filtros', async () => {
  const { tmdb } = await pedir('/api/descobrir');

  assert.deepEqual(tmdb.chamadas[0].args, [{ ordem: 'nota', provedores: [], pagina: 1 }]);
});

test('ordem desconhecida vira nota', async () => {
  const { tmdb } = await pedir('/api/descobrir?ordem=xyz');

  assert.equal(tmdb.chamadas[0].args[0].ordem, 'nota');
});

test('provedores inválidos são ignorados', async () => {
  const { tmdb } = await pedir('/api/descobrir?provedores=8,abc,,-3,119');

  assert.deepEqual(tmdb.chamadas[0].args[0].provedores, [8, 119]);
});

test('busca vazia não chama o TMDB', async () => {
  const { status, corpo, tmdb } = await pedir('/api/buscar?q=%20%20');

  assert.equal(status, 200);
  assert.deepEqual(corpo, { pagina: 1, totalPaginas: 0, filmes: [] });
  assert.equal(tmdb.chamadas.length, 0);
});

test('busca envia o texto sem espaços nas pontas', async () => {
  const { status, corpo, tmdb } = await pedir('/api/buscar?q=%20A%C3%A7%C3%A3o%20&pagina=3');

  assert.equal(status, 200);
  assert.deepEqual(tmdb.chamadas[0].args, [{ texto: 'Ação', pagina: 3 }]);
  assert.equal(corpo.filmes[0].titulo, 'Clube da Luta');
});

test('filme junta detalhes e resenhas', async () => {
  const { status, corpo, tmdb } = await pedir('/api/filme/550');

  assert.equal(status, 200);
  const pedidosDeResenha = tmdb.chamadas.filter((c) => c.nome === 'resenhas').map((c) => c.args);
  assert.deepEqual(pedidosDeResenha.sort(), [[550, 'en-US'], [550, 'pt-BR']]);
  assert.equal(corpo.titulo, 'Clube da Luta');
  assert.equal(corpo.duracaoMin, 139);
  assert.equal(corpo.ondeAssistir.assinatura[0].nome, 'Netflix');
  assert.deepEqual(corpo.resenhas.map((r) => [r.id, r.idioma]), [['r1', 'pt-BR'], ['r2', 'en-US']]);
});

test('id inválido é 404 sem chamar o TMDB', async () => {
  for (const id of ['abc', '0', '-5', '1.5']) {
    const { status, corpo, tmdb } = await pedir(`/api/filme/${id}`);
    assert.equal(status, 404, `id ${id}`);
    assert.deepEqual(corpo, { erro: 'Filme não encontrado.' });
    assert.equal(tmdb.chamadas.length, 0);
  }
});

test('TMDB 404 vira 404', async () => {
  const { status, corpo } = await pedir('/api/filme/999999999', criarTmdbFalso({ detalhes: new ErroTmdb(404) }));

  assert.equal(status, 404);
  assert.deepEqual(corpo, { erro: 'Filme não encontrado.' });
});

test('TMDB fora do ar vira 502', async () => {
  const { status, corpo } = await pedir('/api/descobrir', criarTmdbFalso({ descobrir: new ErroTmdb(0) }));

  assert.equal(status, 502);
  assert.deepEqual(corpo, { erro: 'Não foi possível falar com o TMDB agora. Tente de novo em instantes.' });
});

test('token inválido também vira 502', async () => {
  const { status } = await pedir('/api/provedores', criarTmdbFalso({ provedores: new ErroTmdb(401) }));

  assert.equal(status, 502);
});

test('provedores ordenados com os principais primeiro e marcados', async () => {
  const { status, corpo } = await pedir('/api/provedores');

  assert.equal(status, 200);
  assert.deepEqual(corpo, [
    { id: 8, nome: 'Netflix', logo: '/n.jpg', principal: true },
    { id: 2, nome: 'Apple TV', logo: '/a.jpg', principal: false },
  ]);
});

test('endereço com caractere inválido é 400 e não culpa o TMDB', async () => {
  const { status, corpo, tmdb } = await pedir('/api/filme/%E0');

  assert.equal(status, 400);
  assert.deepEqual(corpo, { erro: 'Endereço inválido.' });
  assert.equal(tmdb.chamadas.length, 0);
});

test('erro no nosso próprio código é 500 e não culpa o TMDB', async () => {
  const { status, corpo } = await pedir('/api/filme/550', criarTmdbFalso({ detalhes: new TypeError('bug nosso') }));

  assert.equal(status, 500);
  assert.deepEqual(corpo, { erro: 'Algo deu errado no servidor. Tente de novo em instantes.' });
});

test('rota /api que não existe responde 404 em JSON', async () => {
  const { status, corpo } = await pedir('/api/nada');

  assert.equal(status, 404);
  assert.deepEqual(corpo, { erro: 'Endereço não encontrado.' });
});
