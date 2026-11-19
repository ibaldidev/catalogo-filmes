// Funções puras que montam pedaços de HTML (como texto) a partir dos dados.
// Todo texto que vem do TMDB passa por escaparHtml antes de entrar no HTML.

import { escaparHtml, urlImagem, formatarNota } from './formatar.js';

// Cartão de um filme numa grade (página inicial e busca).
export function cartaoFilme(filme) {
  const titulo = escaparHtml(filme.titulo);
  const poster = urlImagem(filme.poster);

  const imagem = poster
    ? `<img class="cartao-poster" src="${poster}" alt="Pôster de ${titulo}" loading="lazy">`
    : `<div class="cartao-poster sem-poster">Sem pôster</div>`;

  const ano = filme.ano ? `<span class="cartao-ano">${filme.ano}</span>` : '';

  return `
    <a class="cartao" href="filme.html?id=${filme.id}">
      ${imagem}
      <div class="cartao-info">
        <h3 class="cartao-titulo">${titulo}</h3>
        <div class="cartao-detalhes">
          ${ano}
          <span class="cartao-nota" title="Nota no TMDB">★ ${formatarNota(filme.nota)}</span>
        </div>
      </div>
    </a>`;
}

// Mensagem para quando não há nada a mostrar (ou deu erro).
export function listaVazia(mensagem) {
  return `<p class="vazio">${escaparHtml(mensagem)}</p>`;
}
