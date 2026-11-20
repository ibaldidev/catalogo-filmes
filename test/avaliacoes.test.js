import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarApp } from '../server/app.js';
import { abrirBanco } from '../server/banco.js';
import { ligarComunidade } from './ajudantes.js';

// Roda o teste com um servidor novo e desliga no fim.
async function comComunidade(teste) {
  const comunidade = await ligarComunidade({ criarApp, abrirBanco });
  try {
    await teste(comunidade);
  } finally {
    await comunidade.fechar();
  }
}

const URL_LER = '/api/filme/550/avaliacoes';
const URL_MINHA = '/api/filme/550/avaliacao';

function avaliar(navegador, corpo) {
  return navegador.pedir(URL_MINHA, { metodo: 'PUT', corpo });
}

test('filme sem avaliações: media null, total 0', () => comComunidade(async ({ semLogin }) => {
  const { status, corpo } = await semLogin().pedir(URL_LER);

  assert.equal(status, 200);
  assert.deepEqual(corpo, { media: null, total: 0, minha: null, outras: [] });
}));

test('avaliar sem login é 401', () => comComunidade(async ({ semLogin }) => {
  const { status, corpo } = await avaliar(semLogin(), { nota: 8 });

  assert.equal(status, 401);
  assert.deepEqual(corpo, { erro: 'Entre na sua conta para continuar.' });
}));

test('avaliar, ler e ver a média', () => comComunidade(async ({ novoUsuario, semLogin, relogio }) => {
  const ana = await novoUsuario('Ana');
  const bia = await novoUsuario('Bia');

  const { status, corpo: daAna } = await avaliar(ana, { nota: 8, texto: '  Gostei muito.  ' });
  assert.equal(status, 200);
  assert.deepEqual(daAna, {
    id: daAna.id, autor: 'Ana', nota: 8, texto: 'Gostei muito.',
    criadoEm: new Date(relogio.agora).toISOString(), editada: false,
  });

  relogio.agora += 1000;
  await avaliar(bia, { nota: 9 });

  const paraAna = (await ana.pedir(URL_LER)).corpo;
  assert.equal(paraAna.media, 8.5);
  assert.equal(paraAna.total, 2);
  assert.equal(paraAna.minha.autor, 'Ana');
  assert.deepEqual(paraAna.outras.map((a) => a.autor), ['Bia']);
  assert.equal(paraAna.outras[0].texto, ''); // sem texto: string vazia, nunca null

  const paraVisitante = (await semLogin().pedir(URL_LER)).corpo;
  assert.equal(paraVisitante.minha, null);
  assert.deepEqual(paraVisitante.outras.map((a) => a.autor), ['Bia', 'Ana']); // a mais nova primeiro
}));

test('média com uma casa decimal', () => comComunidade(async ({ novoUsuario, semLogin }) => {
  await avaliar(await novoUsuario('Ana'), { nota: 8 });
  await avaliar(await novoUsuario('Bia'), { nota: 8 });
  await avaliar(await novoUsuario('Caio'), { nota: 9 });

  assert.equal((await semLogin().pedir(URL_LER)).corpo.media, 8.3); // 8,333...
}));

test('avaliar de novo edita (uma por pessoa)', () => comComunidade(async ({ novoUsuario, relogio }) => {
  const ana = await novoUsuario('Ana');
  await avaliar(ana, { nota: 8, texto: 'Bom' });
  relogio.agora += 1000;
  const { corpo: editada } = await avaliar(ana, { nota: 6, texto: 'Revi e gostei menos' });

  assert.equal(editada.nota, 6);
  assert.equal(editada.editada, true);
  const { corpo } = await ana.pedir(URL_LER);
  assert.equal(corpo.total, 1);
  assert.equal(corpo.minha.texto, 'Revi e gostei menos');
}));

test('nota e texto são validados', () => comComunidade(async ({ novoUsuario }) => {
  const ana = await novoUsuario('Ana');

  for (const nota of [0, 11, 7.5, '8', null, undefined]) {
    const { status, corpo } = await avaliar(ana, { nota });
    assert.equal(status, 400, `nota ${nota}`);
    assert.deepEqual(corpo, { erro: 'A nota precisa ser um número inteiro de 1 a 10.' });
  }

  const longo = await avaliar(ana, { nota: 8, texto: 'a'.repeat(5001) });
  assert.equal(longo.status, 400);
  assert.deepEqual(longo.corpo, { erro: 'O texto pode ter no máximo 5.000 caracteres.' });

  assert.equal((await avaliar(ana, { nota: 8, texto: 'a'.repeat(5000) })).status, 200);
}));

test('apagar a própria avaliação; apagar sem ter é 404', () => comComunidade(async ({ novoUsuario }) => {
  const ana = await novoUsuario('Ana');
  await avaliar(ana, { nota: 8 });

  assert.equal((await ana.pedir(URL_MINHA, { metodo: 'DELETE', corpo: {} })).status, 204);
  assert.equal((await ana.pedir(URL_LER)).corpo.total, 0);

  const deNovo = await ana.pedir(URL_MINHA, { metodo: 'DELETE', corpo: {} });
  assert.equal(deNovo.status, 404);
  assert.deepEqual(deNovo.corpo, { erro: 'Você ainda não avaliou este filme.' });
}));

test('cada um só mexe na própria avaliação', () => comComunidade(async ({ novoUsuario, semLogin }) => {
  const ana = await novoUsuario('Ana');
  const bia = await novoUsuario('Bia');
  await avaliar(ana, { nota: 8 });

  // A Bia tenta apagar "a avaliação" do filme: só existe a dela, que não existe.
  assert.equal((await bia.pedir(URL_MINHA, { metodo: 'DELETE', corpo: {} })).status, 404);
  // Mandar um usuarioId no corpo não muda nada: o servidor usa a sessão.
  await avaliar(bia, { nota: 1, usuarioId: 1 });

  const { corpo } = await semLogin().pedir(URL_LER);
  assert.equal(corpo.total, 2);
  assert.deepEqual(corpo.outras.map((a) => [a.autor, a.nota]).sort(), [['Ana', 8], ['Bia', 1]]);
}));

test('avaliações não expõem e-mail', () => comComunidade(async ({ novoUsuario }) => {
  const ana = await novoUsuario('Ana');
  await avaliar(ana, { nota: 8 });

  assert.ok(!JSON.stringify((await ana.pedir(URL_LER)).corpo).includes('@'));
}));

test('id de filme inválido é 404', () => comComunidade(async ({ novoUsuario, semLogin }) => {
  const ler = await semLogin().pedir('/api/filme/abc/avaliacoes');
  assert.equal(ler.status, 404);
  assert.deepEqual(ler.corpo, { erro: 'Filme não encontrado.' });

  const ana = await novoUsuario('Ana');
  assert.equal((await ana.pedir('/api/filme/0/avaliacao', { metodo: 'PUT', corpo: { nota: 8 } })).status, 404);
}));
