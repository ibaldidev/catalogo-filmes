// Cliente do TMDB: o único lugar do projeto que conversa com a API do TMDB.
// Ele monta os endereços (URLs), envia o token e transforma falhas em ErroTmdb.

import { REGIAO, IDIOMA, MIN_VOTOS, MAX_PAGINA } from './constantes.js';

const URL_BASE = 'https://api.themoviedb.org/3';

// Erro com o código de status HTTP que o TMDB respondeu.
// status 0 significa que nem conseguimos falar com o TMDB (sem internet, por exemplo).
export class ErroTmdb extends Error {
  constructor(status, mensagem = `TMDB respondeu com status ${status}`) {
    super(mensagem);
    this.name = 'ErroTmdb';
    this.status = status;
  }
}

// Transforma qualquer valor numa página válida: um número inteiro de 1 a 500.
export function limitarPagina(valor) {
  const numero = Math.floor(Number(valor));
  if (!Number.isFinite(numero) || numero < 1) return 1;
  return Math.min(numero, MAX_PAGINA);
}

// fetchFn permite que os testes troquem o fetch de verdade por um falso.
// tempoLimiteMs: se o TMDB não responder nesse tempo, desistimos (em vez de esperar minutos).
export function criarClienteTmdb({ token, fetchFn = fetch, tempoLimiteMs = 10000 }) {
  // Faz um pedido GET ao TMDB e devolve o JSON da resposta.
  async function get(caminho, parametros = {}) {
    const url = new URL(URL_BASE + caminho);
    for (const [nome, valor] of Object.entries(parametros)) {
      url.searchParams.set(nome, valor); // searchParams cuida de acentos e espaços
    }

    let resposta;
    try {
      resposta = await fetchFn(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(tempoLimiteMs), // cancela o pedido quando o tempo acaba
      });
    } catch (erro) {
      throw new ErroTmdb(0, `Não foi possível conectar ao TMDB: ${erro.message}`);
    }

    if (!resposta.ok) throw new ErroTmdb(resposta.status);
    return resposta.json();
  }

  return {
    descobrir({ ordem, provedores = [], pagina }) {
      const parametros = {
        language: IDIOMA,
        watch_region: REGIAO,
        with_watch_monetization_types: 'flatrate',
        page: limitarPagina(pagina),
      };
      if (ordem === 'populares') {
        parametros.sort_by = 'popularity.desc';
      } else {
        parametros.sort_by = 'vote_average.desc';
        parametros['vote_count.gte'] = MIN_VOTOS;
      }
      if (provedores.length > 0) {
        parametros.with_watch_providers = provedores.join('|'); // "|" significa OU
      }
      return get('/discover/movie', parametros);
    },

    buscar({ texto, pagina }) {
      return get('/search/movie', { query: texto, language: IDIOMA, page: limitarPagina(pagina) });
    },

    detalhes(id) {
      return get(`/movie/${id}`, { language: IDIOMA, append_to_response: 'watch/providers' });
    },

    resenhas(id, idioma) {
      return get(`/movie/${id}/reviews`, { language: idioma });
    },

    provedores() {
      return get('/watch/providers/movie', { language: IDIOMA, watch_region: REGIAO });
    },
  };
}
