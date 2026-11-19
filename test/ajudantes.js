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

// Liga o app numa porta livre qualquer (porta 0 = "o sistema escolhe")
// e devolve o endereço e uma função para desligar.
export function iniciarServidor(app) {
  return new Promise((resolver) => {
    const servidor = app.listen(0, () => {
      const { port } = servidor.address();
      resolver({
        url: `http://localhost:${port}`,
        fechar: () => new Promise((fim) => servidor.close(fim)),
      });
    });
  });
}
