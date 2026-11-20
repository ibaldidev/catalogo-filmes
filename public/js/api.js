// Funções que o navegador usa para pedir dados ao NOSSO servidor (/api/...).
// O navegador nunca fala direto com o TMDB: quem tem o token é o servidor.
// O cookie de login vai junto automaticamente: o navegador cuida disso sozinho.

// Faz o pedido e devolve o JSON. Se der erro, lança um Error com uma mensagem amigável.
export async function pedirJson(url, opcoes) {
  let resposta;
  try {
    resposta = await fetch(url, opcoes);
  } catch {
    throw new Error('Não foi possível conectar ao site. Confira sua internet e tente de novo.');
  }

  if (resposta.status === 204) return null; // 204 = deu certo, sem nada para devolver

  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(corpo.erro || 'Algo deu errado. Tente de novo em instantes.');
  }
  return corpo;
}

// Envia dados em JSON (cadastrar, avaliar, comentar, apagar...).
// O servidor só aceita escrita em JSON: é uma das proteções contra pedidos forjados.
export function enviarJson(url, metodo, corpo = {}) {
  return pedirJson(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
}

// ---------- Catálogo (fase 1) ----------

export function carregarProvedores() {
  return pedirJson('/api/provedores');
}

export function descobrir({ ordem, provedores, pagina }) {
  const parametros = new URLSearchParams({ ordem, provedores: provedores.join(','), pagina });
  return pedirJson(`/api/descobrir?${parametros}`);
}

export function buscar(texto, pagina) {
  const parametros = new URLSearchParams({ q: texto, pagina });
  return pedirJson(`/api/buscar?${parametros}`);
}

export function carregarFilme(id) {
  return pedirJson(`/api/filme/${encodeURIComponent(id)}`);
}

// ---------- Conta ----------

export function cadastrar({ nome, email, senha }) {
  return enviarJson('/api/conta/cadastrar', 'POST', { nome, email, senha });
}

export function entrar({ email, senha }) {
  return enviarJson('/api/conta/entrar', 'POST', { email, senha });
}

export function sair() {
  return enviarJson('/api/conta/sair', 'POST');
}

// Quem está usando o site agora? Devolve o usuário, ou null para visitante.
export async function quemSouEu() {
  return (await pedirJson('/api/conta/eu')).usuario;
}

// ---------- Comunidade ----------

export function carregarAvaliacoes(filmeId) {
  return pedirJson(`/api/filme/${encodeURIComponent(filmeId)}/avaliacoes`);
}

export function salvarAvaliacao(filmeId, { nota, texto }) {
  return enviarJson(`/api/filme/${encodeURIComponent(filmeId)}/avaliacao`, 'PUT', { nota, texto });
}

export function apagarAvaliacao(filmeId) {
  return enviarJson(`/api/filme/${encodeURIComponent(filmeId)}/avaliacao`, 'DELETE');
}

export function carregarComentarios(filmeId) {
  return pedirJson(`/api/filme/${encodeURIComponent(filmeId)}/comentarios`);
}

export function comentar(filmeId, { texto, respostaA = null }) {
  return enviarJson(`/api/filme/${encodeURIComponent(filmeId)}/comentarios`, 'POST', { texto, respostaA });
}

export function apagarComentario(comentarioId) {
  return enviarJson(`/api/comentarios/${encodeURIComponent(comentarioId)}`, 'DELETE');
}
