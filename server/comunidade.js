// A comunidade: avaliações (sem spoilers) e comentários da Discussão (com spoilers).
// Todas as funções recebem o id do usuário DA SESSÃO, nunca um id enviado pelo navegador.

import { ErroPedido } from './erros.js';

const LIMITE_TEXTO_AVALIACAO = 5000;

// Data do banco (milissegundos) → texto ISO, que o navegador sabe ler.
function dataIso(ms) {
  return new Date(ms).toISOString();
}

// 8.333 → 8.3
function arredondar(numero) {
  return Math.round(numero * 10) / 10;
}

export function criarComunidade(db, { agora = Date.now } = {}) {
  const sql = {
    // JOIN junta cada avaliação com a linha do usuário que escreveu, para pegar o nome.
    avaliacoesDoFilme: db.prepare(`
      SELECT avaliacoes.id, avaliacoes.usuario_id, usuarios.nome AS autor, avaliacoes.nota,
             avaliacoes.texto, avaliacoes.criado_em, avaliacoes.atualizado_em
      FROM avaliacoes JOIN usuarios ON usuarios.id = avaliacoes.usuario_id
      WHERE avaliacoes.filme_id = ?
      ORDER BY avaliacoes.criado_em DESC, avaliacoes.id DESC`),
    // AVG = média, COUNT = quantas. O próprio banco calcula.
    resumo: db.prepare('SELECT AVG(nota) AS media, COUNT(*) AS total FROM avaliacoes WHERE filme_id = ?'),
    // "Criar ou trocar": se já existe uma avaliação desta pessoa para este filme,
    // ON CONFLICT ... DO UPDATE atualiza a nota e o texto em vez de dar erro.
    salvar: db.prepare(`
      INSERT INTO avaliacoes (usuario_id, filme_id, nota, texto, criado_em, atualizado_em)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (usuario_id, filme_id)
      DO UPDATE SET nota = excluded.nota, texto = excluded.texto, atualizado_em = excluded.atualizado_em`),
    umaAvaliacao: db.prepare(`
      SELECT avaliacoes.id, usuarios.nome AS autor, avaliacoes.nota, avaliacoes.texto,
             avaliacoes.criado_em, avaliacoes.atualizado_em
      FROM avaliacoes JOIN usuarios ON usuarios.id = avaliacoes.usuario_id
      WHERE avaliacoes.usuario_id = ? AND avaliacoes.filme_id = ?`),
    apagarAvaliacao: db.prepare('DELETE FROM avaliacoes WHERE usuario_id = ? AND filme_id = ?'),
  };

  // Linha do banco → formato da API (sem usuario_id e sem e-mail).
  function paraAvaliacao(linha) {
    return {
      id: linha.id,
      autor: linha.autor,
      nota: linha.nota,
      texto: linha.texto,
      criadoEm: dataIso(linha.criado_em),
      editada: linha.atualizado_em > linha.criado_em,
    };
  }

  function avaliacoesDoFilme(filmeId, usuarioId = null) {
    const linhas = sql.avaliacoesDoFilme.all(filmeId);
    const { media, total } = sql.resumo.get(filmeId);
    const minha = linhas.find((linha) => linha.usuario_id === usuarioId);
    return {
      media: total > 0 ? arredondar(media) : null,
      total,
      minha: minha ? paraAvaliacao(minha) : null,
      outras: linhas.filter((linha) => linha !== minha).map(paraAvaliacao),
    };
  }

  function salvarAvaliacao(usuarioId, filmeId, { nota, texto = '' } = {}) {
    if (!Number.isInteger(nota) || nota < 1 || nota > 10) {
      throw new ErroPedido(400, 'A nota precisa ser um número inteiro de 1 a 10.');
    }
    const textoLimpo = String(texto ?? '').trim();
    if (textoLimpo.length > LIMITE_TEXTO_AVALIACAO) {
      throw new ErroPedido(400, 'O texto pode ter no máximo 5.000 caracteres.');
    }

    const momento = agora();
    sql.salvar.run(usuarioId, filmeId, nota, textoLimpo, momento, momento);
    return paraAvaliacao(sql.umaAvaliacao.get(usuarioId, filmeId));
  }

  function apagarAvaliacao(usuarioId, filmeId) {
    const { changes } = sql.apagarAvaliacao.run(usuarioId, filmeId);
    if (changes === 0) throw new ErroPedido(404, 'Você ainda não avaliou este filme.');
  }

  return { avaliacoesDoFilme, salvarAvaliacao, apagarAvaliacao };
}
