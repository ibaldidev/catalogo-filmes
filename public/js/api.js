// Funções que o navegador usa para pedir dados ao NOSSO servidor (/api/...).
// O navegador nunca fala direto com o TMDB: quem tem o token é o servidor.

// Faz o pedido e devolve o JSON. Se der erro, lança um Error com uma mensagem amigável.
export async function pedirJson(url) {
  let resposta;
  try {
    resposta = await fetch(url);
  } catch {
    throw new Error('Não foi possível conectar ao site. Confira sua internet e tente de novo.');
  }

  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(corpo.erro || 'Algo deu errado. Tente de novo em instantes.');
  }
  return corpo;
}

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
