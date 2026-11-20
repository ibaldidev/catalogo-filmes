// Cookies: pequenos textos que o servidor pede ao navegador para guardar
// e que o navegador devolve em todo pedido seguinte (no cabeçalho "Cookie").

const TRINTA_DIAS_EM_SEGUNDOS = 30 * 24 * 60 * 60;

// "a=1; sessao=xyz" → { a: '1', sessao: 'xyz' }
export function lerCookies(cabecalho = '') {
  const cookies = {};
  for (const parte of String(cabecalho ?? '').split(';')) {
    const posicao = parte.indexOf('=');
    if (posicao === -1) continue;
    const nome = parte.slice(0, posicao).trim();
    const valor = parte.slice(posicao + 1).trim();
    try {
      cookies[nome] = decodeURIComponent(valor);
    } catch {
      cookies[nome] = valor; // valor estranho (ex.: "%E0"): fica como veio
    }
  }
  return cookies;
}

// O "crachá" de login. Cada atributo tem um papel:
//   HttpOnly       o JavaScript da página não consegue ler (protege contra roubo por script)
//   SameSite=Lax   o navegador não envia o cookie em pedidos feitos por outros sites (CSRF)
//   Path=/         vale para o site inteiro
//   Max-Age        validade, em segundos
export function cookieSessao(token) {
  return `sessao=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${TRINTA_DIAS_EM_SEGUNDOS}`;
}

// Max-Age=0 manda o navegador jogar o cookie fora agora.
export function cookieApagado() {
  return 'sessao=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0';
}
