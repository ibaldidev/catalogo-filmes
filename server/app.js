// O servidor: define as rotas /api e entrega os arquivos do site (pasta public/).
// Recebe o cliente do TMDB "de fora" para que os testes possam usar um falso.

import express from 'express';
import { fileURLToPath } from 'node:url';
import { ErroTmdb, limitarPagina } from './tmdb.js';
import { abrirBanco } from './banco.js';
import { criarContas } from './contas.js';
import { ErroPedido } from './erros.js';
import { lerCookies, cookieSessao, cookieApagado } from './cookies.js';
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
const ERRO_ENDERECO = 'Endereço inválido.';
const ERRO_ROTA = 'Endereço não encontrado.';
const ERRO_INTERNO = 'Algo deu errado no servidor. Tente de novo em instantes.';
const ERRO_SEM_JSON = 'Envie os dados em JSON.';
const ERRO_DADOS = 'Dados inválidos.';
const METODOS_DE_ESCRITA = ['POST', 'PUT', 'PATCH', 'DELETE'];

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

// Recebe de fora o cliente do TMDB, o banco e o relógio, para que os testes possam
// usar versões falsas. Sem banco, usa um na memória (os testes da fase 1 não precisam dele).
export function criarApp({ tmdb, db = abrirBanco(), agora = Date.now }) {
  const app = express();
  const contas = criarContas(db, { agora });

  // Arquivos do site: index.html, css, js, imagens...
  app.use(express.static(PASTA_PUBLICA));

  // ---------- "Middlewares": funções que rodam antes de toda rota /api ----------

  // 1) Toda escrita precisa vir em JSON. Um formulário HTML comum de outro site
  //    não consegue enviar JSON, então isto é mais uma proteção contra CSRF.
  app.use('/api', (req, res, next) => {
    if (METODOS_DE_ESCRITA.includes(req.method) && !req.is('application/json')) {
      next(new ErroPedido(400, ERRO_SEM_JSON));
      return;
    }
    next();
  });

  // 2) Lê o corpo JSON do pedido para req.body (no máximo 20 KB).
  app.use('/api', express.json({ limit: '20kb' }));

  // 3) Descobre quem está fazendo o pedido, pelo cookie "sessao".
  //    Depois daqui, toda rota sabe: req.usuario é o usuário, ou null se não entrou.
  app.use('/api', (req, res, next) => {
    req.token = lerCookies(req.headers.cookie).sessao;
    req.usuario = contas.usuarioDaSessao(req.token);
    next();
  });

  // ---------- Contas ----------

  // Cadastro: cria a conta e já entra (status 201 = "criado").
  app.post('/api/conta/cadastrar', (req, res) => {
    const usuario = contas.cadastrar(req.body);
    const token = contas.abrirSessao(usuario.id);
    res.status(201).set('Set-Cookie', cookieSessao(token)).json({ usuario: { id: usuario.id, nome: usuario.nome } });
  });

  app.post('/api/conta/entrar', (req, res) => {
    const { token, usuario } = contas.entrar(req.body);
    res.set('Set-Cookie', cookieSessao(token)).json({ usuario: { id: usuario.id, nome: usuario.nome } });
  });

  // Sair: apaga a sessão no banco e pede ao navegador para jogar o cookie fora.
  // (status 204 = "deu certo, e não há nada para devolver")
  app.post('/api/conta/sair', (req, res) => {
    contas.sair(req.token);
    res.set('Set-Cookie', cookieApagado()).status(204).end();
  });

  // Quem sou eu? Só aqui o e-mail aparece, e só o da própria pessoa.
  app.get('/api/conta/eu', (req, res) => {
    res.json({ usuario: req.usuario });
  });

  // ---------- Catálogo (fase 1) ----------

  // Lista de serviços de streaming do Brasil.
  app.get('/api/provedores', async (req, res) => {
    const raw = await tmdb.provedores();
    const provedores = raw.results.map(simplificarProvedor);
    // "principal" diz ao navegador quais serviços mostrar antes de "Ver todos".
    const ordenados = ordenarProvedores(provedores, PROVEDORES_PRINCIPAIS)
      .map((p) => ({ ...p, principal: PROVEDORES_PRINCIPAIS.includes(p.id) }));
    res.json(ordenados);
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

  // Qualquer outro endereço /api/... não existe: responde em JSON, como as outras rotas.
  app.use('/api', (req, res) => {
    res.status(404).json({ erro: ERRO_ROTA });
  });

  // Tratador de erros: qualquer erro nas rotas acima chega aqui.
  // (As 4 entradas - erro, req, res, next - são o que faz o Express reconhecê-lo.)
  // Cada tipo de erro ganha o código e a mensagem certos:
  //   404 = o filme não existe no TMDB
  //   502 = o TMDB falhou (fora do ar, lento, token errado)
  //   400 = o próprio endereço pedido está quebrado (ex.: /api/filme/%E0)
  //   500 = um defeito no NOSSO código
  //   ErroPedido = erros esperados da comunidade (400, 401, 403, 404), com mensagem própria
  app.use((erro, req, res, next) => {
    if (erro instanceof ErroPedido) {
      res.status(erro.status).json({ erro: erro.message });
      return;
    }
    // O JSON enviado estava quebrado ou grande demais.
    if (erro.type === 'entity.parse.failed' || erro.type === 'entity.too.large') {
      res.status(400).json({ erro: ERRO_DADOS });
      return;
    }
    if (erro instanceof ErroTmdb) {
      if (erro.status === 404) {
        res.status(404).json({ erro: ERRO_NAO_ENCONTRADO });
        return;
      }
      console.error(erro);
      res.status(502).json({ erro: ERRO_TMDB });
      return;
    }
    if (erro.status >= 400 && erro.status < 500) {
      res.status(400).json({ erro: ERRO_ENDERECO });
      return;
    }
    console.error(erro);
    res.status(500).json({ erro: ERRO_INTERNO });
  });

  return app;
}
