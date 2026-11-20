// Contas e sessões: cadastro, login ("entrar"), "quem é você?" e sair.
// "agora" vem de fora para que os testes controlem o relógio (ex.: pular 30 dias).

import { randomBytes, createHash } from 'node:crypto';
import { gerarHashSenha, conferirSenha } from './senhas.js';
import { ErroPedido } from './erros.js';

const DURACAO_SESSAO_MS = 30 * 24 * 60 * 60 * 1000;
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ERRO_LOGIN = 'E-mail ou senha incorretos.';

// O banco guarda só o hash do token: quem copiar o arquivo do banco
// não consegue montar um cookie válido a partir dele.
function hashDoToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function criarContas(db, { agora = Date.now } = {}) {
  // Consultas preparadas: os "?" são preenchidos pelo banco, com segurança.
  // Nunca juntamos texto do usuário dentro do SQL (isso abriria a porta para "injeção de SQL").
  const sql = {
    porEmail: db.prepare('SELECT id, nome, email, hash_senha FROM usuarios WHERE email = ?'),
    porNome: db.prepare('SELECT id FROM usuarios WHERE nome = ?'),
    inserir: db.prepare('INSERT INTO usuarios (email, nome, hash_senha, criado_em) VALUES (?, ?, ?, ?)'),
    novaSessao: db.prepare('INSERT INTO sessoes (hash_token, usuario_id, expira_em) VALUES (?, ?, ?)'),
    daSessao: db.prepare(`
      SELECT usuarios.id, usuarios.nome, usuarios.email
      FROM sessoes JOIN usuarios ON usuarios.id = sessoes.usuario_id
      WHERE sessoes.hash_token = ? AND sessoes.expira_em > ?`),
    apagarSessao: db.prepare('DELETE FROM sessoes WHERE hash_token = ?'),
    apagarVencidas: db.prepare('DELETE FROM sessoes WHERE expira_em <= ?'),
  };

  function cadastrar({ email, senha, nome } = {}) {
    const emailLimpo = String(email ?? '').trim().toLowerCase();
    const nomeLimpo = String(nome ?? '').trim();

    if (!EMAIL_VALIDO.test(emailLimpo)) throw new ErroPedido(400, 'Informe um e-mail válido.');
    if (typeof senha !== 'string' || senha.length < 8) {
      throw new ErroPedido(400, 'A senha precisa ter pelo menos 8 caracteres.');
    }
    if (senha.length > 200) throw new ErroPedido(400, 'A senha pode ter no máximo 200 caracteres.');
    if (nomeLimpo.length < 2 || nomeLimpo.length > 30) {
      throw new ErroPedido(400, 'O nome precisa ter de 2 a 30 caracteres.');
    }
    // \p{C} = caracteres "de controle" e invisíveis (ex.: espaço de largura zero).
    // Sem esta regra, "Ana" + um caractere invisível pareceria a Ana na tela.
    if (/\p{C}/u.test(nomeLimpo)) {
      throw new ErroPedido(400, 'O nome tem caracteres que não são permitidos.');
    }
    if (sql.porEmail.get(emailLimpo)) throw new ErroPedido(400, 'Este e-mail já tem conta. Tente entrar.');
    if (sql.porNome.get(nomeLimpo)) throw new ErroPedido(400, 'Este nome já está em uso. Escolha outro.');

    const { lastInsertRowid } = sql.inserir.run(emailLimpo, nomeLimpo, gerarHashSenha(senha), agora());
    return { id: Number(lastInsertRowid), nome: nomeLimpo, email: emailLimpo };
  }

  function entrar({ email, senha } = {}) {
    const linha = sql.porEmail.get(String(email ?? '').trim().toLowerCase());
    // A mesma mensagem para "e-mail não existe" e "senha errada":
    // assim ninguém descobre quais e-mails têm conta no site.
    if (!linha || !conferirSenha(String(senha ?? ''), linha.hash_senha)) {
      throw new ErroPedido(400, ERRO_LOGIN);
    }

    const usuario = { id: linha.id, nome: linha.nome, email: linha.email };
    return { token: abrirSessao(usuario.id), usuario };
  }

  // Cria uma sessão nova e devolve o token (o "crachá" que vai no cookie).
  function abrirSessao(usuarioId) {
    sql.apagarVencidas.run(agora()); // faxina: sessões vencidas não servem para nada
    const token = randomBytes(32).toString('base64url'); // 32 bytes aleatórios: impossível de adivinhar
    sql.novaSessao.run(hashDoToken(token), usuarioId, agora() + DURACAO_SESSAO_MS);
    return token;
  }

  // Quem é o dono deste token? (null se o token for vazio, desconhecido ou vencido)
  function usuarioDaSessao(token) {
    if (!token) return null;
    const linha = sql.daSessao.get(hashDoToken(String(token)), agora());
    return linha ? { id: linha.id, nome: linha.nome, email: linha.email } : null;
  }

  function sair(token) {
    if (token) sql.apagarSessao.run(hashDoToken(String(token)));
  }

  return { cadastrar, entrar, abrirSessao, usuarioDaSessao, sair };
}
