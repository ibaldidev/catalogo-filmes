import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarClienteTmdb, ErroTmdb, limitarPagina } from '../server/tmdb.js';
import { criarFetchFalso } from './ajudantes.js';

// Monta um cliente do TMDB que usa o fetch falso.
function criarCliente(resposta, status) {
  const falso = criarFetchFalso(resposta, status);
  const cliente = criarClienteTmdb({ token: 'TOKEN-TESTE', fetchFn: falso.fn });
  return { cliente, chamadas: falso.chamadas };
}

test('envia o token e usa a URL base', async () => {
  const { cliente, chamadas } = criarCliente({ results: [] });
  await cliente.provedores();

  const { url, opcoes } = chamadas[0];
  assert.equal(url.origin + url.pathname, 'https://api.themoviedb.org/3/watch/providers/movie');
  assert.equal(opcoes.headers.Authorization, 'Bearer TOKEN-TESTE');
  assert.equal(url.searchParams.get('watch_region'), 'BR');
  assert.equal(url.searchParams.get('language'), 'pt-BR');
});

test('descobrir por nota: assinatura, BR, mínimo 300 votos', async () => {
  const { cliente, chamadas } = criarCliente({ results: [] });
  await cliente.descobrir({ ordem: 'nota', provedores: [], pagina: 1 });

  const { url } = chamadas[0];
  assert.equal(url.pathname, '/3/discover/movie');
  assert.equal(url.searchParams.get('sort_by'), 'vote_average.desc');
  assert.equal(url.searchParams.get('vote_count.gte'), '300');
  assert.equal(url.searchParams.get('with_watch_monetization_types'), 'flatrate');
  assert.equal(url.searchParams.get('watch_region'), 'BR');
  assert.equal(url.searchParams.get('language'), 'pt-BR');
  assert.equal(url.searchParams.get('page'), '1');
  assert.equal(url.searchParams.has('with_watch_providers'), false);
});

test('descobrir populares não exige mínimo de votos', async () => {
  const { cliente, chamadas } = criarCliente({ results: [] });
  await cliente.descobrir({ ordem: 'populares', provedores: [], pagina: 1 });

  const { url } = chamadas[0];
  assert.equal(url.searchParams.get('sort_by'), 'popularity.desc');
  assert.equal(url.searchParams.has('vote_count.gte'), false);
});

test('vários provedores viram OU', async () => {
  const { cliente, chamadas } = criarCliente({ results: [] });
  await cliente.descobrir({ ordem: 'nota', provedores: [8, 119], pagina: 1 });

  assert.equal(chamadas[0].url.searchParams.get('with_watch_providers'), '8|119');
});

test('descobrir limita a página a 500', async () => {
  const { cliente, chamadas } = criarCliente({ results: [] });
  await cliente.descobrir({ ordem: 'nota', provedores: [], pagina: 999 });

  assert.equal(chamadas[0].url.searchParams.get('page'), '500');
});

test('buscar mantém acentos e espaços', async () => {
  const { cliente, chamadas } = criarCliente({ results: [] });
  await cliente.buscar({ texto: 'Ação Cidade de Deus', pagina: 2 });

  const { url } = chamadas[0];
  assert.equal(url.pathname, '/3/search/movie');
  assert.equal(url.searchParams.get('query'), 'Ação Cidade de Deus');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.get('language'), 'pt-BR');
});

test('detalhes pede watch/providers junto', async () => {
  const { cliente, chamadas } = criarCliente({ id: 550 });
  await cliente.detalhes(550);

  const { url } = chamadas[0];
  assert.equal(url.pathname, '/3/movie/550');
  assert.equal(url.searchParams.get('append_to_response'), 'watch/providers');
  assert.equal(url.searchParams.get('language'), 'pt-BR');
});

test('resenhas usa o idioma pedido', async () => {
  const { cliente, chamadas } = criarCliente({ results: [] });
  await cliente.resenhas(550, 'en-US');

  const { url } = chamadas[0];
  assert.equal(url.pathname, '/3/movie/550/reviews');
  assert.equal(url.searchParams.get('language'), 'en-US');
});

test('devolve o JSON que o TMDB respondeu', async () => {
  const { cliente } = criarCliente({ id: 550, title: 'Clube da Luta' });
  const filme = await cliente.detalhes(550);

  assert.deepEqual(filme, { id: 550, title: 'Clube da Luta' });
});

test('limitarPagina', () => {
  assert.equal(limitarPagina(999), 500);
  assert.equal(limitarPagina(0), 1);
  assert.equal(limitarPagina('abc'), 1);
  assert.equal(limitarPagina(undefined), 1);
  assert.equal(limitarPagina('3'), 3);
  assert.equal(limitarPagina(2.7), 2);
});

test('resposta de erro vira ErroTmdb com status', async () => {
  const { cliente } = criarCliente({ status_message: 'not found' }, 404);

  await assert.rejects(cliente.detalhes(999999999), (erro) => {
    assert.ok(erro instanceof ErroTmdb);
    assert.equal(erro.status, 404);
    return true;
  });
});

test('TMDB que não responde vira ErroTmdb com status 0 depois do tempo limite', { timeout: 2000 }, async () => {
  // fetch que nunca responde: só termina se o pedido for cancelado (signal).
  const fetchTravado = (url, opcoes) => new Promise((_, rejeitar) => {
    opcoes.signal?.addEventListener('abort', () => rejeitar(opcoes.signal.reason));
  });
  const cliente = criarClienteTmdb({ token: 'TOKEN-TESTE', fetchFn: fetchTravado, tempoLimiteMs: 50 });

  await assert.rejects(cliente.provedores(), (erro) => {
    assert.ok(erro instanceof ErroTmdb);
    assert.equal(erro.status, 0);
    return true;
  });
});

test('falha de rede vira ErroTmdb com status 0', async () => {
  const fetchQueFalha = async () => { throw new TypeError('fetch failed'); };
  const cliente = criarClienteTmdb({ token: 'TOKEN-TESTE', fetchFn: fetchQueFalha });

  await assert.rejects(cliente.provedores(), (erro) => {
    assert.ok(erro instanceof ErroTmdb);
    assert.equal(erro.status, 0);
    return true;
  });
});
