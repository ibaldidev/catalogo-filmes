import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarApp } from '../server/app.js';
import { abrirBanco } from '../server/banco.js';
import { iniciarServidor, criarNavegador } from './ajudantes.js';

const ana = { email: 'ana@x.com', senha: 'senha-da-ana', nome: 'Ana' };

// Liga um servidor com banco novo, entrega um navegador ao teste e desliga no fim.
async function comServidor(teste) {
  const servidor = await iniciarServidor(criarApp({ tmdb: {}, db: abrirBanco() }));
  try {
    await teste(criarNavegador(servidor.url));
  } finally {
    await servidor.fechar();
  }
}

test('cadastrar responde 201, entra e o cookie é HttpOnly e SameSite=Lax', () => comServidor(async (navegador) => {
  const { status, corpo, cabecalhos } = await navegador.pedir('/api/conta/cadastrar', { metodo: 'POST', corpo: ana });

  assert.equal(status, 201);
  assert.deepEqual(corpo, { usuario: { id: corpo.usuario.id, nome: 'Ana' } });
  const cookie = cabecalhos.getSetCookie()[0];
  assert.match(cookie, /^sessao=[^;]+;/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
}));

test('cadastro inválido responde 400 com a mensagem', () => comServidor(async (navegador) => {
  const { status, corpo } = await navegador.pedir('/api/conta/cadastrar', { metodo: 'POST', corpo: { ...ana, senha: '123' } });

  assert.equal(status, 400);
  assert.deepEqual(corpo, { erro: 'A senha precisa ter pelo menos 8 caracteres.' });
}));

test('/api/conta/eu com e sem login', () => comServidor(async (navegador) => {
  assert.deepEqual((await navegador.pedir('/api/conta/eu')).corpo, { usuario: null });

  await navegador.pedir('/api/conta/cadastrar', { metodo: 'POST', corpo: ana });
  const { corpo } = await navegador.pedir('/api/conta/eu');

  assert.deepEqual(corpo, { usuario: { id: corpo.usuario.id, nome: 'Ana', email: 'ana@x.com' } });
}));

test('entrar e sair', () => comServidor(async (navegador) => {
  await navegador.pedir('/api/conta/cadastrar', { metodo: 'POST', corpo: ana });
  await navegador.pedir('/api/conta/sair', { metodo: 'POST', corpo: {} });
  assert.equal(navegador.cookie, '');

  const errado = await navegador.pedir('/api/conta/entrar', { metodo: 'POST', corpo: { email: ana.email, senha: 'errada-123' } });
  assert.equal(errado.status, 400);
  assert.deepEqual(errado.corpo, { erro: 'E-mail ou senha incorretos.' });

  const certo = await navegador.pedir('/api/conta/entrar', { metodo: 'POST', corpo: { email: ana.email, senha: ana.senha } });
  assert.equal(certo.status, 200);
  assert.equal(certo.corpo.usuario.nome, 'Ana');
  assert.equal((await navegador.pedir('/api/conta/eu')).corpo.usuario.nome, 'Ana');
}));

test('sair apaga a sessão no servidor (o cookie antigo não vale mais)', () => comServidor(async (navegador) => {
  await navegador.pedir('/api/conta/cadastrar', { metodo: 'POST', corpo: ana });
  const cookieAntigo = navegador.cookie;

  const { status } = await navegador.pedir('/api/conta/sair', { metodo: 'POST', corpo: {} });
  assert.equal(status, 204);

  navegador.cookie = cookieAntigo; // alguém que tivesse copiado o cookie
  assert.deepEqual((await navegador.pedir('/api/conta/eu')).corpo, { usuario: null });
}));

test('token inventado é tratado como sem login', () => comServidor(async (navegador) => {
  navegador.cookie = 'sessao=inventado';

  assert.deepEqual((await navegador.pedir('/api/conta/eu')).corpo, { usuario: null });
}));

test('escrita sem JSON é recusada', () => comServidor(async (navegador) => {
  const { status, corpo } = await navegador.pedir('/api/conta/cadastrar', {
    metodo: 'POST', corpo: 'email=ana@x.com', tipo: 'text/plain',
  });

  assert.equal(status, 400);
  assert.deepEqual(corpo, { erro: 'Envie os dados em JSON.' });
}));

test('escrita sem corpo nenhum também é recusada', () => comServidor(async (navegador) => {
  const { status, corpo } = await navegador.pedir('/api/conta/sair', { metodo: 'POST' });

  assert.equal(status, 400);
  assert.deepEqual(corpo, { erro: 'Envie os dados em JSON.' });
}));

test('JSON malformado é 400 Dados inválidos', () => comServidor(async (navegador) => {
  const { status, corpo } = await navegador.pedir('/api/conta/entrar', { metodo: 'POST', corpo: '{quebrado' });

  assert.equal(status, 400);
  assert.deepEqual(corpo, { erro: 'Dados inválidos.' });
}));

test('respostas nunca contêm senha nem hash', () => comServidor(async (navegador) => {
  const respostas = [
    await navegador.pedir('/api/conta/cadastrar', { metodo: 'POST', corpo: ana }),
    await navegador.pedir('/api/conta/eu'),
    await navegador.pedir('/api/conta/entrar', { metodo: 'POST', corpo: { email: ana.email, senha: ana.senha } }),
  ];

  for (const { corpo } of respostas) {
    const texto = JSON.stringify(corpo);
    assert.ok(!texto.includes(ana.senha));
    assert.ok(!texto.includes('scrypt$'));
  }
}));
