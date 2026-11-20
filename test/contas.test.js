import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { abrirBanco } from '../server/banco.js';
import { criarContas } from '../server/contas.js';
import { ErroPedido } from '../server/erros.js';

const TRINTA_DIAS = 30 * 24 * 60 * 60 * 1000;

// Contas com um banco novo na memória e um relógio falso que o teste controla.
function preparar() {
  const relogio = { agora: 1_000_000 };
  const db = abrirBanco();
  const contas = criarContas(db, { agora: () => relogio.agora });
  return { db, contas, relogio };
}

const ana = { email: 'ana@x.com', senha: 'senha-da-ana', nome: 'Ana' };

// Confere que a função lança ErroPedido com o status e a mensagem esperados.
function lancaErro(funcao, status, mensagem) {
  assert.throws(funcao, (erro) => {
    assert.ok(erro instanceof ErroPedido, `esperava ErroPedido, veio ${erro}`);
    assert.equal(erro.status, status);
    assert.equal(erro.message, mensagem);
    return true;
  });
}

test('cadastrar normaliza e-mail e nome', () => {
  const { contas } = preparar();
  const usuario = contas.cadastrar({ email: ' Ana@X.com ', senha: 'senha-da-ana', nome: ' Ana ' });

  assert.deepEqual(usuario, { id: usuario.id, nome: 'Ana', email: 'ana@x.com' });
});

test('cadastrar valida e-mail, senha e nome', () => {
  const { contas } = preparar();

  lancaErro(() => contas.cadastrar({ ...ana, email: 'sem-arroba' }), 400, 'Informe um e-mail válido.');
  lancaErro(() => contas.cadastrar({ ...ana, email: undefined }), 400, 'Informe um e-mail válido.');
  lancaErro(() => contas.cadastrar({ ...ana, senha: '1234567' }), 400, 'A senha precisa ter pelo menos 8 caracteres.');
  lancaErro(() => contas.cadastrar({ ...ana, senha: 12345678 }), 400, 'A senha precisa ter pelo menos 8 caracteres.');
  lancaErro(() => contas.cadastrar({ ...ana, senha: 'a'.repeat(201) }), 400, 'A senha pode ter no máximo 200 caracteres.');
  lancaErro(() => contas.cadastrar({ ...ana, nome: ' A ' }), 400, 'O nome precisa ter de 2 a 30 caracteres.');
  lancaErro(() => contas.cadastrar({ ...ana, nome: 'a'.repeat(31) }), 400, 'O nome precisa ter de 2 a 30 caracteres.');
});

test('e-mail ou nome repetido é recusado', () => {
  const { contas } = preparar();
  contas.cadastrar(ana);

  lancaErro(() => contas.cadastrar({ ...ana, email: 'ANA@x.com', nome: 'Outra' }), 400, 'Este e-mail já tem conta. Tente entrar.');
  lancaErro(() => contas.cadastrar({ ...ana, email: 'outra@x.com', nome: 'ana' }), 400, 'Este nome já está em uso. Escolha outro.');
});

test('entrar certo devolve token e usuário', () => {
  const { contas } = preparar();
  contas.cadastrar(ana);

  const { token, usuario } = contas.entrar({ email: 'ANA@x.com ', senha: 'senha-da-ana' });

  assert.ok(token.length >= 40);
  assert.equal(usuario.nome, 'Ana');
  assert.deepEqual(contas.usuarioDaSessao(token), usuario);
});

test('entrar errado: mesma mensagem para e-mail inexistente e senha errada', () => {
  const { contas } = preparar();
  contas.cadastrar(ana);

  lancaErro(() => contas.entrar({ email: 'ana@x.com', senha: 'errada-123' }), 400, 'E-mail ou senha incorretos.');
  lancaErro(() => contas.entrar({ email: 'nao@existe.com', senha: 'senha-da-ana' }), 400, 'E-mail ou senha incorretos.');
  lancaErro(() => contas.entrar({}), 400, 'E-mail ou senha incorretos.');
});

test('banco guarda o hash do token, não o token', () => {
  const { db, contas } = preparar();
  contas.cadastrar(ana);
  const { token } = contas.entrar({ email: ana.email, senha: ana.senha });

  const { hash_token } = db.prepare('SELECT hash_token FROM sessoes').get();
  assert.notEqual(hash_token, token);
  assert.equal(hash_token, createHash('sha256').update(token).digest('hex'));
});

test('sessão expira em 30 dias', () => {
  const { contas, relogio } = preparar();
  contas.cadastrar(ana);
  const { token } = contas.entrar({ email: ana.email, senha: ana.senha });

  relogio.agora += TRINTA_DIAS - 1;
  assert.notEqual(contas.usuarioDaSessao(token), null);
  relogio.agora += 2;
  assert.equal(contas.usuarioDaSessao(token), null);
});

test('sair invalida a sessão; token vazio ou inventado não é ninguém', () => {
  const { contas } = preparar();
  contas.cadastrar(ana);
  const { token } = contas.entrar({ email: ana.email, senha: ana.senha });

  contas.sair(token);
  assert.equal(contas.usuarioDaSessao(token), null);
  assert.equal(contas.usuarioDaSessao(''), null);
  assert.equal(contas.usuarioDaSessao(undefined), null);
  assert.equal(contas.usuarioDaSessao('inventado'), null);
});
