// Ferramentas usadas só pelos testes.

// Cria um "fetch falso": em vez de ir à internet, ele anota cada pedido
// (para o teste conferir depois) e devolve a resposta que mandarmos.
export function criarFetchFalso(resposta = {}, status = 200) {
  const chamadas = [];
  async function fn(url, opcoes) {
    chamadas.push({ url: new URL(url), opcoes });
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => resposta,
    };
  }
  return { fn, chamadas };
}
