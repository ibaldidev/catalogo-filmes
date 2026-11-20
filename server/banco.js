// O banco de dados da comunidade: um arquivo SQLite (ou só na memória, nos testes).
// SQLite já vem dentro do Node.js (node:sqlite): nada para instalar.

import { DatabaseSync } from 'node:sqlite';

// As tabelas, escritas em SQL. "IF NOT EXISTS" deixa abrir o mesmo banco várias vezes.
//
// Algumas palavras do SQL usadas aqui:
//   PRIMARY KEY      o número que identifica cada linha (o banco gera sozinho)
//   NOT NULL         a coluna é obrigatória
//   UNIQUE           não pode haver duas linhas com o mesmo valor
//   COLLATE NOCASE   compara sem diferenciar maiúsculas ("Ana" = "ana")
//   REFERENCES       aponta para uma linha de outra tabela
//   ON DELETE CASCADE  se a linha apontada for apagada, esta vai junto
//   CHECK            uma regra que o próprio banco confere
const TABELAS = `
  CREATE TABLE IF NOT EXISTS usuarios (
    id         INTEGER PRIMARY KEY,
    email      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    nome       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    hash_senha TEXT    NOT NULL,
    criado_em  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessoes (
    hash_token TEXT    PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    expira_em  INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS avaliacoes (
    id            INTEGER PRIMARY KEY,
    usuario_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    filme_id      INTEGER NOT NULL,
    nota          INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 10),
    texto         TEXT    NOT NULL DEFAULT '',
    criado_em     INTEGER NOT NULL,
    atualizado_em INTEGER NOT NULL,
    UNIQUE (usuario_id, filme_id)
  );

  CREATE TABLE IF NOT EXISTS comentarios (
    id         INTEGER PRIMARY KEY,
    filme_id   INTEGER NOT NULL,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    resposta_a INTEGER REFERENCES comentarios(id) ON DELETE CASCADE,
    texto      TEXT    NOT NULL,
    apagado    INTEGER NOT NULL DEFAULT 0,
    criado_em  INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_avaliacoes_filme ON avaliacoes (filme_id);
  CREATE INDEX IF NOT EXISTS idx_comentarios_filme ON comentarios (filme_id);
`;

// Abre (ou cria) o banco e garante que as tabelas existem.
// ':memory:' = um banco que vive só na memória e some ao fechar (ótimo para testes).
export function abrirBanco(caminho = ':memory:') {
  const db = new DatabaseSync(caminho);
  db.exec('PRAGMA foreign_keys = ON'); // o SQLite só respeita REFERENCES com isto ligado
  db.exec(TABELAS);
  return db;
}
