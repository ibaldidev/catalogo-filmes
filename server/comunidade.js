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

  // ---------- Comentários da Discussão (com spoilers) ----------
  // Comentários e respostas moram na MESMA tabela. A coluna resposta_a diz quem é quem:
  //   resposta_a vazio (NULL)  → comentário
  //   resposta_a = 12          → resposta ao comentário 12

  const sqlComentarios = {
    doFilme: db.prepare(`
      SELECT comentarios.id, comentarios.usuario_id, comentarios.resposta_a, comentarios.texto,
             comentarios.apagado, comentarios.criado_em, usuarios.nome AS autor
      FROM comentarios JOIN usuarios ON usuarios.id = comentarios.usuario_id
      WHERE comentarios.filme_id = ?
      ORDER BY comentarios.criado_em, comentarios.id`),
    um: db.prepare('SELECT id, filme_id, usuario_id, resposta_a, apagado FROM comentarios WHERE id = ?'),
    inserir: db.prepare(
      'INSERT INTO comentarios (filme_id, usuario_id, resposta_a, texto, criado_em) VALUES (?, ?, ?, ?, ?)',
    ),
    quantasRespostas: db.prepare('SELECT COUNT(*) AS total FROM comentarios WHERE resposta_a = ?'),
    marcarApagado: db.prepare("UPDATE comentarios SET apagado = 1, texto = '' WHERE id = ?"),
    apagar: db.prepare('DELETE FROM comentarios WHERE id = ?'),
    nomeDoUsuario: db.prepare('SELECT nome FROM usuarios WHERE id = ?'),
  };

  const NAO_ENCONTRADO = 'Comentário não encontrado.';

  function paraResposta(linha, usuarioId) {
    return {
      id: linha.id,
      autor: linha.autor,
      texto: linha.texto,
      criadoEm: dataIso(linha.criado_em),
      meu: linha.usuario_id === usuarioId,
      respostaA: linha.resposta_a,
    };
  }

  function paraComentario(linha, usuarioId) {
    const apagado = linha.apagado === 1;
    return {
      id: linha.id,
      autor: apagado ? null : linha.autor, // de um comentário apagado, não mostramos nem o autor
      texto: apagado ? null : linha.texto,
      apagado,
      criadoEm: dataIso(linha.criado_em),
      meu: !apagado && linha.usuario_id === usuarioId,
      respostas: [],
    };
  }

  // Monta a "árvore" de um nível: cada comentário com as respostas penduradas embaixo.
  function comentariosDoFilme(filmeId, usuarioId = null) {
    const linhas = sqlComentarios.doFilme.all(filmeId); // da mais antiga para a mais nova
    const porId = new Map();
    for (const linha of linhas) {
      if (linha.resposta_a === null) {
        porId.set(linha.id, paraComentario(linha, usuarioId));
      } else {
        porId.get(linha.resposta_a)?.respostas.push(paraResposta(linha, usuarioId));
      }
    }
    return [...porId.values()]
      .filter((comentario) => !comentario.apagado || comentario.respostas.length > 0)
      .reverse(); // comentários: o mais novo primeiro (as respostas continuam em ordem de chegada)
  }

  function comentar(usuarioId, filmeId, { texto, respostaA = null } = {}) {
    const textoLimpo = String(texto ?? '').trim();
    if (textoLimpo === '') throw new ErroPedido(400, 'Escreva algo antes de enviar.');
    if (textoLimpo.length > 2000) throw new ErroPedido(400, 'O comentário pode ter no máximo 2.000 caracteres.');

    // Se for resposta, descobre o comentário-pai. Responder a uma resposta
    // pendura a nova resposta no mesmo comentário (um nível só).
    let paiId = null;
    if (respostaA !== null && respostaA !== undefined) {
      const alvo = Number.isInteger(respostaA) ? sqlComentarios.um.get(respostaA) : undefined;
      if (!alvo || alvo.filme_id !== filmeId) throw new ErroPedido(404, NAO_ENCONTRADO);
      paiId = alvo.resposta_a ?? alvo.id;
      if (sqlComentarios.um.get(paiId).apagado === 1) throw new ErroPedido(404, NAO_ENCONTRADO);
    }

    const momento = agora();
    const { lastInsertRowid } = sqlComentarios.inserir.run(filmeId, usuarioId, paiId, textoLimpo, momento);
    const linha = { id: Number(lastInsertRowid), usuario_id: usuarioId, resposta_a: paiId, texto: textoLimpo,
      apagado: 0, criado_em: momento, autor: nomeDoUsuario(usuarioId) };
    return paiId === null ? paraComentario(linha, usuarioId) : paraResposta(linha, usuarioId);
  }

  function nomeDoUsuario(usuarioId) {
    return sqlComentarios.nomeDoUsuario.get(usuarioId).nome;
  }

  function apagarComentario(usuarioId, comentarioId) {
    const alvo = sqlComentarios.um.get(comentarioId);
    if (!alvo || alvo.apagado === 1) throw new ErroPedido(404, NAO_ENCONTRADO);
    // 403: sabemos quem é a pessoa, mas o comentário não é dela.
    if (alvo.usuario_id !== usuarioId) throw new ErroPedido(403, 'Você só pode apagar o que você escreveu.');

    const ehComentario = alvo.resposta_a === null;
    if (ehComentario && sqlComentarios.quantasRespostas.get(alvo.id).total > 0) {
      // Tem respostas: vira "Comentário apagado" para a conversa não perder o sentido.
      // O texto é apagado de verdade (privacidade), não só escondido.
      sqlComentarios.marcarApagado.run(alvo.id);
      return;
    }

    sqlComentarios.apagar.run(alvo.id);

    // Era a última resposta de um comentário já apagado? Então o comentário some também.
    if (!ehComentario) {
      const pai = sqlComentarios.um.get(alvo.resposta_a);
      if (pai.apagado === 1 && sqlComentarios.quantasRespostas.get(pai.id).total === 0) {
        sqlComentarios.apagar.run(pai.id);
      }
    }
  }

  return { avaliacoesDoFilme, salvarAvaliacao, apagarAvaliacao, comentariosDoFilme, comentar, apagarComentario };
}
