// O servidor: define as rotas /api e entrega os arquivos do site (pasta public/).
// Recebe o cliente do TMDB "de fora" para que os testes possam usar um falso.

import express from 'express';
import { fileURLToPath } from 'node:url';
import { ErroTmdb, limitarPagina } from './tmdb.js';
import { MAX_PAGINA, PROVEDORES_PRINCIPAIS } from './constantes.js';
import {
  simplificarResumo,
  simplificarResenha,
  juntarResenhas,
  simplificarDetalhe,
  simplificarProvedor,
  ordenarProvedores,
} from './simplificar.js';

const PASTA_PUBLICA = fileURLToPath(new URL('../public', import.meta.url));
const ERRO_NAO_ENCONTRADO = 'Filme não encontrado.';
const ERRO_TMDB = 'Não foi possível falar com o TMDB agora. Tente de novo em instantes.';

// "8,119,abc" → [8, 119] (ignora o que não for número inteiro positivo)
function lerProvedores(texto = '') {
  return String(texto)
    .split(',')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
}

// Lista do TMDB (descobrir ou buscar) → formato do nosso site.
function simplificarLista(raw) {
  return {
    pagina: raw.page,
    totalPaginas: Math.min(raw.total_pages, MAX_PAGINA),
    filmes: raw.results.map(simplificarResumo),
  };
}

export function criarApp({ tmdb }) {
  const app = express();

  // Arquivos do site: index.html, css, js, imagens...
  app.use(express.static(PASTA_PUBLICA));

  // Lista de serviços de streaming do Brasil.
  app.get('/api/provedores', async (req, res) => {
    const raw = await tmdb.provedores();
    const provedores = raw.results.map(simplificarProvedor);
    res.json(ordenarProvedores(provedores, PROVEDORES_PRINCIPAIS));
  });

  // Melhores (ou mais populares) filmes no streaming.
  app.get('/api/descobrir', async (req, res) => {
    const raw = await tmdb.descobrir({
      ordem: req.query.ordem === 'populares' ? 'populares' : 'nota',
      provedores: lerProvedores(req.query.provedores),
      pagina: limitarPagina(req.query.pagina),
    });
    res.json(simplificarLista(raw));
  });

  // Busca por nome.
  app.get('/api/buscar', async (req, res) => {
    const texto = String(req.query.q ?? '').trim();
    if (texto === '') {
      res.json({ pagina: 1, totalPaginas: 0, filmes: [] }); // nada para buscar
      return;
    }
    const raw = await tmdb.buscar({ texto, pagina: limitarPagina(req.query.pagina) });
    res.json(simplificarLista(raw));
  });

  // Página completa de um filme.
  app.get('/api/filme/:id', async (req, res) => {
    if (!/^[1-9]\d*$/.test(req.params.id)) {
      res.status(404).json({ erro: ERRO_NAO_ENCONTRADO });
      return;
    }
    const id = Number(req.params.id);

    // Os três pedidos saem ao mesmo tempo; Promise.all espera todos chegarem.
    const [raw, rawPt, rawEn] = await Promise.all([
      tmdb.detalhes(id),
      tmdb.resenhas(id, 'pt-BR'),
      tmdb.resenhas(id, 'en-US'),
    ]);
    const resenhas = juntarResenhas(
      rawPt.results.map((r) => simplificarResenha(r, 'pt-BR')),
      rawEn.results.map((r) => simplificarResenha(r, 'en-US')),
    );
    res.json(simplificarDetalhe(raw, resenhas));
  });

  // Tratador de erros: qualquer erro nas rotas acima chega aqui.
  // (As 4 entradas - erro, req, res, next - são o que faz o Express reconhecê-lo.)
  app.use((erro, req, res, next) => {
    if (erro instanceof ErroTmdb && erro.status === 404) {
      res.status(404).json({ erro: ERRO_NAO_ENCONTRADO });
      return;
    }
    console.error(erro);
    res.status(502).json({ erro: ERRO_TMDB });
  });

  return app;
}
