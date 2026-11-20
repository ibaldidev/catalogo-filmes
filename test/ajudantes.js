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

// "Navegador de mentira" para os testes: faz pedidos ao servidor e, como um navegador
// de verdade, guarda o cookie "sessao" que o servidor mandar e o devolve nos próximos.
export function criarNavegador(url) {
  const navegador = {
    cookie: '', // ex.: 'sessao=abc'. O teste pode trocar à mão (para simular um token falso).

    async pedir(caminho, { metodo = 'GET', corpo, tipo = 'application/json' } = {}) {
      const cabecalhos = {};
      if (navegador.cookie) cabecalhos.cookie = navegador.cookie;
      if (corpo !== undefined) cabecalhos['content-type'] = tipo;

      const resposta = await fetch(url + caminho, {
        method: metodo,
        headers: cabecalhos,
        body: corpo === undefined ? undefined : typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
      });

      for (const linha of resposta.headers.getSetCookie()) {
        const [par] = linha.split(';');
        if (!par.startsWith('sessao=')) continue;
        navegador.cookie = /Max-Age=0/i.test(linha) ? '' : par;
      }

      const texto = await resposta.text();
      return {
        status: resposta.status,
        corpo: texto ? JSON.parse(texto) : null,
        cabecalhos: resposta.headers,
      };
    },
  };
  return navegador;
}
