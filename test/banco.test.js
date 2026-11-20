import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { abrirBanco } from '../server/banco.js';

// Guarda um usuário direto no banco (só para os testes desta tabela).
function inserirUsuario(db, email, nome) {
  return db
    .prepare('INSERT INTO usuarios (email, nome, hash_senha, criado_em) VALUES (?, ?, ?, ?)')
    .run(email, nome, 'hash', 0).lastInsertRowid;
}

test('cria as quatro tabelas', () => {
  const db = abrirBanco();
  const nomes = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((linha) => linha.name);

  assert.deepEqual(nomes, ['avaliacoes', 'comentarios', 'sessoes', 'usuarios']);
});

test('abrir duas vezes o mesmo banco não dá erro', () => {
  const pasta = mkdtempSync(join(tmpdir(), 'em-cartaz-'));
  const caminho = join(pasta, 'teste.db');
  try {
    abrirBanco(caminho).close();
    const db = abrirBanco(caminho); // as tabelas já existem: não pode quebrar
    db.close();
  } finally {
    rmSync(pasta, { recursive: true, force: true });
  }
});

test('e-mail repetido é recusado, sem diferenciar maiúsculas', () => {
  const db = abrirBanco();
  inserirUsuario(db, 'ana@x.com', 'Ana');

  assert.throws(() => inserirUsuario(db, 'ANA@x.com', 'Outra'), /UNIQUE/);
});

test('uma avaliação por usuário por filme', () => {
  const db = abrirBanco();
  const id = inserirUsuario(db, 'ana@x.com', 'Ana');
  const avaliar = db.prepare(
    'INSERT INTO avaliacoes (usuario_id, filme_id, nota, criado_em, atualizado_em) VALUES (?, ?, ?, 0, 0)',
  );
  avaliar.run(id, 550, 8);

  assert.throws(() => avaliar.run(id, 550, 9), /UNIQUE/);
});

test('nota fora de 1..10 é recusada pelo banco', () => {
  const db = abrirBanco();
  const id = inserirUsuario(db, 'ana@x.com', 'Ana');
  const avaliar = db.prepare(
    'INSERT INTO avaliacoes (usuario_id, filme_id, nota, criado_em, atualizado_em) VALUES (?, ?, ?, 0, 0)',
  );

  assert.throws(() => avaliar.run(id, 550, 11), /CHECK/);
  assert.throws(() => avaliar.run(id, 551, 0), /CHECK/);
});
