// Para onde mandar a pessoa depois de entrar ou criar a conta.
// O endereço vem da URL (?volta=...), então qualquer um pode montar um link com
// qualquer coisa ali. Se aceitássemos tudo, um link malicioso poderia mandar a pessoa
// para um site falso logo depois do login (isso se chama "open redirect").
// Por isso só aceitamos as nossas três páginas, com ou sem "?algo" no fim.

const PAGINA_NOSSA = /^(index|busca|filme)\.html(\?[^#]*)?$/;

export function destinoSeguro(volta) {
  return typeof volta === 'string' && PAGINA_NOSSA.test(volta) ? volta : 'index.html';
}

// Link para a página de entrar, lembrando para onde voltar depois.
export function linkEntrar(destino) {
  return `entrar.html?volta=${encodeURIComponent(destino)}`;
}

// ('/filme.html', '?id=550') → 'filme.html?id=550'. O endereço "/" é a página inicial.
export function destinoDe(caminho, busca) {
  const pagina = caminho.split('/').pop() || 'index.html';
  return pagina + busca;
}
