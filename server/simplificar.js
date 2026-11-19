// Funções puras que transformam o JSON grande do TMDB no formato
// pequeno (e em português) que o nosso site usa.

// Tipos de acesso do TMDB → nomes que usamos no site.
const TIPOS_DE_ACESSO = {
  flatrate: 'assinatura',
  free: 'gratis',
  ads: 'anuncios',
  rent: 'aluguel',
  buy: 'compra',
};

// Arredonda para 1 casa decimal: 8.438 → 8.4
function arredondar(numero) {
  return Math.round(numero * 10) / 10;
}

// Um filme numa lista (página inicial, busca).
export function simplificarResumo(raw) {
  const votos = raw.vote_count ?? 0;
  return {
    id: raw.id,
    titulo: raw.title,
    ano: raw.release_date ? Number(raw.release_date.slice(0, 4)) : null,
    poster: raw.poster_path || null,
    nota: votos > 0 ? arredondar(raw.vote_average) : null, // sem votos, a nota não diz nada
    votos,
  };
}

// Um serviço de streaming.
export function simplificarProvedor(raw) {
  return { id: raw.provider_id, nome: raw.provider_name, logo: raw.logo_path || null };
}

// Onde assistir no Brasil. Recebe só a parte "BR" (ou undefined, se não houver).
export function simplificarOndeAssistir(rawRegiao) {
  const resultado = { disponivel: false, link: rawRegiao?.link ?? null };

  for (const [tipoTmdb, nossoNome] of Object.entries(TIPOS_DE_ACESSO)) {
    resultado[nossoNome] = (rawRegiao?.[tipoTmdb] ?? []).map(simplificarProvedor);
    if (resultado[nossoNome].length > 0) resultado.disponivel = true;
  }

  return resultado;
}

// Uma resenha. O idioma vem de fora porque o TMDB não informa.
export function simplificarResenha(raw, idioma) {
  return {
    id: raw.id,
    autor: raw.author,
    texto: raw.content ?? '', // sem texto, a página mostra a resenha vazia em vez de quebrar
    idioma,
    nota: raw.author_details?.rating ?? null,
    data: raw.created_at,
  };
}

// Junta as resenhas em português e em inglês, sem repetir a mesma resenha.
export function juntarResenhas(pt, en) {
  const vistos = new Set();
  const todas = [];
  for (const resenha of [...pt, ...en]) {
    if (vistos.has(resenha.id)) continue;
    vistos.add(resenha.id);
    todas.push(resenha);
  }
  return todas;
}

// Página completa de um filme.
export function simplificarDetalhe(raw, resenhas) {
  return {
    ...simplificarResumo(raw),
    duracaoMin: raw.runtime || null,
    generos: (raw.genres ?? []).map((genero) => genero.name),
    sinopse: raw.overview || null,
    ondeAssistir: simplificarOndeAssistir(raw['watch/providers']?.results?.BR),
    resenhas,
  };
}

// Coloca os serviços principais primeiro (na ordem dada) e o resto em ordem alfabética.
export function ordenarProvedores(provedores, principais) {
  const primeiros = principais
    .map((id) => provedores.find((p) => p.id === id))
    .filter(Boolean);
  const resto = provedores
    .filter((p) => !principais.includes(p.id))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return [...primeiros, ...resto];
}
