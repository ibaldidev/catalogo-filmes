import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarApp } from '../server/app.js';
import { abrirBanco } from '../server/banco.js';
import { ligarComunidade } from './ajudantes.js';

// TMDB falso, só para o teste que confere a rota /api/filme/:id.
const tmdbFalso = {
  detalhes: async (id) => ({ id, title: 'Filme', vote_count: 0, genres: [] }),
  resenhas: async () => ({ results: [] }),
};

async function comComunidade(teste) {
  const comunidade = await ligarComunidade({ criarApp, abrirBanco, tmdb: tmdbFalso });
  try {
    await teste(comunidade);
  } finally {
    await comunidade.fechar();
  }
}

const URL_LISTA = '/api/filme/550/comentarios';

// Publica um comentário (ou uma resposta, se vier respostaA) e devolve o corpo da resposta.
async function comentar(navegador, texto, respostaA, url = URL_LISTA) {
  const { status, corpo } = await navegador.pedir(url, { metodo: 'POST', corpo: { texto, respostaA } });
  if (status !== 201) throw new Error(`comentar respondeu ${status}: ${JSON.stringify(corpo)}`);
  return corpo;
}

function apagar(navegador, id) {
  return navegador.pedir(`/api/comentarios/${id}`, { metodo: 'DELETE', corpo: {} });
}

test('comentar sem login é 401', () => comComunidade(async ({ semLogin }) => {
  const { status, corpo } = await semLogin().pedir(URL_LISTA, { metodo: 'POST', corpo: { texto: 'oi' } });

  assert.equal(status, 401);
  assert.deepEqual(corpo, { erro: 'Entre na sua conta para continuar.' });
  assert.equal((await apagar(semLogin(), 1)).status, 401);
}));

test('comentário e respostas na ordem certa', () => comComunidade(async ({ novoUsuario, semLogin, relogio }) => {
  const ana = await novoUsuario('Ana');
  const bia = await novoUsuario('Bia');

  const c1 = await comentar(ana, '  O final é genial.  ');
  assert.deepEqual(c1, {
    id: c1.id, autor: 'Ana', texto: 'O final é genial.', apagado: false,
    criadoEm: new Date(relogio.agora).toISOString(), meu: true, respostas: [],
  });
  relogio.agora += 1000;
  const c2 = await comentar(bia, 'Não entendi a cena do porão.');
  relogio.agora += 1000;
  const r1 = await comentar(bia, 'Concordo!', c1.id);
  assert.deepEqual(r1, {
    id: r1.id, autor: 'Bia', texto: 'Concordo!',
    criadoEm: new Date(relogio.agora).toISOString(), meu: true, respostaA: c1.id,
  });
  relogio.agora += 1000;
  await comentar(ana, 'Valeu, Bia.', c1.id);

  const { status, corpo } = await ana.pedir(URL_LISTA);
  assert.equal(status, 200);
  assert.deepEqual(corpo.map((c) => c.id), [c2.id, c1.id]); // o comentário mais novo primeiro
  assert.deepEqual(corpo[1].respostas.map((r) => r.autor), ['Bia', 'Ana']); // respostas em ordem de chegada
  assert.deepEqual(corpo.map((c) => c.meu), [false, true]); // "meu" é do ponto de vista de quem pede

  const paraVisitante = (await semLogin().pedir(URL_LISTA)).corpo;
  assert.ok(paraVisitante.every((c) => !c.meu && c.respostas.every((r) => !r.meu)));
}));

test('responder a uma resposta entra no mesmo comentário', () => comComunidade(async ({ novoUsuario }) => {
  const ana = await novoUsuario('Ana');
  const bia = await novoUsuario('Bia');
  const c1 = await comentar(ana, 'Comentário');
  const r1 = await comentar(bia, 'Resposta', c1.id);

  const r2 = await comentar(ana, '@Bia resposta da resposta', r1.id);

  assert.equal(r2.respostaA, c1.id);
  const [comentario] = (await ana.pedir(URL_LISTA)).corpo;
  assert.deepEqual(comentario.respostas.map((r) => r.id), [r1.id, r2.id]);
}));

test('respostaA inexistente, de outro filme ou apagado é 404', () => comComunidade(async ({ novoUsuario }) => {
  const ana = await novoUsuario('Ana');
  const bia = await novoUsuario('Bia');
  const c1 = await comentar(ana, 'Comentário');
  await comentar(bia, 'Resposta', c1.id);

  const casos = [
    [URL_LISTA, 999999],
    [URL_LISTA, 'abc'],
    ['/api/filme/551/comentarios', c1.id], // c1 é do filme 550
  ];
  for (const [url, respostaA] of casos) {
    const { status, corpo } = await ana.pedir(url, { metodo: 'POST', corpo: { texto: 'oi', respostaA } });
    assert.equal(status, 404, `respostaA ${respostaA} em ${url}`);
    assert.deepEqual(corpo, { erro: 'Comentário não encontrado.' });
  }

  await apagar(ana, c1.id); // fica "Comentário apagado", porque tem resposta
  const { status } = await bia.pedir(URL_LISTA, { metodo: 'POST', corpo: { texto: 'oi', respostaA: c1.id } });
  assert.equal(status, 404);
}));

test('texto vazio, só espaços ou com mais de 2000 caracteres é recusado', () => comComunidade(async ({ novoUsuario }) => {
  const ana = await novoUsuario('Ana');

  for (const texto of ['', '    ', undefined, null]) {
    const { status, corpo } = await ana.pedir(URL_LISTA, { metodo: 'POST', corpo: { texto } });
    assert.equal(status, 400);
    assert.deepEqual(corpo, { erro: 'Escreva algo antes de enviar.' });
  }

  const longo = await ana.pedir(URL_LISTA, { metodo: 'POST', corpo: { texto: 'a'.repeat(2001) } });
  assert.equal(longo.status, 400);
  assert.deepEqual(longo.corpo, { erro: 'O comentário pode ter no máximo 2.000 caracteres.' });

  assert.equal((await ana.pedir(URL_LISTA, { metodo: 'POST', corpo: { texto: 'a'.repeat(2000) } })).status, 201);
}));

test('apagar comentário de outra pessoa é 403', () => comComunidade(async ({ novoUsuario }) => {
  const ana = await novoUsuario('Ana');
  const bia = await novoUsuario('Bia');
  const c1 = await comentar(ana, 'Meu comentário');
  const r1 = await comentar(ana, 'Minha resposta', c1.id);

  for (const id of [c1.id, r1.id]) {
    const { status, corpo } = await apagar(bia, id);
    assert.equal(status, 403);
    assert.deepEqual(corpo, { erro: 'Você só pode apagar o que você escreveu.' });
  }
  assert.equal((await ana.pedir(URL_LISTA)).corpo[0].texto, 'Meu comentário');
}));

test('apagar comentário com respostas mostra "apagado" e mantém as respostas', () => comComunidade(async ({ novoUsuario, db }) => {
  const ana = await novoUsuario('Ana');
  const bia = await novoUsuario('Bia');
  const c1 = await comentar(ana, 'Texto que vai sumir');
  await comentar(bia, 'Resposta da Bia', c1.id);

  assert.equal((await apagar(ana, c1.id)).status, 204);

  const [comentario] = (await ana.pedir(URL_LISTA)).corpo;
  assert.equal(comentario.apagado, true);
  assert.equal(comentario.autor, null);
  assert.equal(comentario.texto, null);
  assert.equal(comentario.meu, false);
  assert.deepEqual(comentario.respostas.map((r) => r.texto), ['Resposta da Bia']);
  // O texto foi apagado de verdade no banco, não só escondido.
  assert.equal(db.prepare('SELECT texto FROM comentarios WHERE id = ?').get(c1.id).texto, '');
  // Apagar de novo: já não existe.
  assert.equal((await apagar(ana, c1.id)).status, 404);
}));

test('apagar comentário sem respostas some da lista', () => comComunidade(async ({ novoUsuario }) => {
  const ana = await novoUsuario('Ana');
  const c1 = await comentar(ana, 'Sozinho');

  assert.equal((await apagar(ana, c1.id)).status, 204);
  assert.deepEqual((await ana.pedir(URL_LISTA)).corpo, []);

  const deNovo = await apagar(ana, c1.id);
  assert.equal(deNovo.status, 404);
  assert.deepEqual(deNovo.corpo, { erro: 'Comentário não encontrado.' });
}));

test('comentário apagado cuja última resposta foi apagada some', () => comComunidade(async ({ novoUsuario }) => {
  const ana = await novoUsuario('Ana');
  const bia = await novoUsuario('Bia');
  const c1 = await comentar(ana, 'Comentário');
  const r1 = await comentar(bia, 'Resposta', c1.id);

  await apagar(ana, c1.id);
  assert.equal((await apagar(bia, r1.id)).status, 204);

  assert.deepEqual((await ana.pedir(URL_LISTA)).corpo, []);
}));

test('id de comentário inválido é 404', () => comComunidade(async ({ novoUsuario }) => {
  const ana = await novoUsuario('Ana');

  for (const id of ['abc', '0', '999999']) {
    const { status, corpo } = await apagar(ana, id);
    assert.equal(status, 404, `id ${id}`);
    assert.deepEqual(corpo, { erro: 'Comentário não encontrado.' });
  }
}));

test('comentários nunca aparecem em /api/filme/:id nem em /avaliacoes', () => comComunidade(async ({ novoUsuario }) => {
  const ana = await novoUsuario('Ana');
  const c1 = await comentar(ana, 'SPOILER-XYZ: ele morre no fim');
  await comentar(ana, 'SPOILER-XYZ de novo', c1.id);
  await ana.pedir('/api/filme/550/avaliacao', { metodo: 'PUT', corpo: { nota: 9, texto: 'Sem spoiler aqui' } });

  for (const url of ['/api/filme/550', '/api/filme/550/avaliacoes']) {
    const { status, corpo } = await ana.pedir(url);
    assert.equal(status, 200, url);
    assert.ok(!JSON.stringify(corpo).includes('SPOILER-XYZ'), url);
  }
}));

test('comentários não expõem e-mail', () => comComunidade(async ({ novoUsuario }) => {
  const ana = await novoUsuario('Ana');
  const c1 = await comentar(ana, 'Comentário');
  await comentar(ana, 'Resposta', c1.id);

  assert.ok(!JSON.stringify((await ana.pedir(URL_LISTA)).corpo).includes('@'));
}));
