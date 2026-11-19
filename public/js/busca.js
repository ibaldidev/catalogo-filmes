// Página de busca: lê o texto da URL (busca.html?q=...), busca e mostra os resultados.

import { buscar } from './api.js';
import { cartaoFilme, listaVazia } from './componentes.js';
import { escaparHtml } from './formatar.js';

const titulo = document.querySelector('#titulo-busca');
const grade = document.querySelector('#grade');
const botaoMais = document.querySelector('#carregar-mais');
const campo = document.querySelector('#campo-busca');

// O formulário do cabeçalho (method GET) coloca o texto na URL como ?q=...
const texto = (new URLSearchParams(location.search).get('q') ?? '').trim();
let pagina = 1;

async function carregar({ acrescentar }) {
  botaoMais.disabled = true;
  try {
    const resultado = await buscar(texto, pagina);
    const html = resultado.filmes.map(cartaoFilme).join('');

    if (acrescentar) {
      grade.insertAdjacentHTML('beforeend', html);
    } else {
      grade.innerHTML = html || listaVazia(`Nenhum filme encontrado para "${texto}". Confira a grafia ou tente outro nome.`);
    }
    botaoMais.hidden = pagina >= resultado.totalPaginas;
    botaoMais.textContent = 'Carregar mais filmes';
  } catch (erro) {
    if (acrescentar) {
      pagina -= 1;
      botaoMais.textContent = 'Não carregou. Tentar de novo';
    } else {
      grade.innerHTML = listaVazia(erro.message);
    }
  } finally {
    botaoMais.disabled = false;
  }
}

campo.value = texto;

if (texto === '') {
  grade.innerHTML = listaVazia('Digite o nome de um filme para buscar.');
  campo.focus();
} else {
  // escaparHtml: o texto veio da URL, então pode ter qualquer coisa dentro.
  titulo.innerHTML = `Resultados para “${escaparHtml(texto)}”`;
  document.title = `${texto} | Em Cartaz`;
  grade.innerHTML = listaVazia('Buscando…');
  carregar({ acrescentar: false });
}

botaoMais.addEventListener('click', () => {
  pagina += 1;
  carregar({ acrescentar: true });
});
