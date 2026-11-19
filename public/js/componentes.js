// Funções puras que montam pedaços de HTML (como texto) a partir dos dados.
// Todo texto que vem do TMDB passa por escaparHtml antes de entrar no HTML.

import { escaparHtml, urlImagem, formatarNota, cortarTexto } from './formatar.js';

// Limite de caracteres antes do "Ler mais" nas resenhas.
export const LIMITE_RESENHA = 600;

// Grupos de "onde assistir", na ordem em que aparecem.
const GRUPOS_ONDE_ASSISTIR = [
  ['assinatura', 'Incluso na assinatura'],
  ['gratis', 'Grátis'],
  ['anuncios', 'Grátis com anúncios'],
  ['aluguel', 'Aluguel'],
  ['compra', 'Compra'],
];

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

// Seção "Onde assistir" da página do filme.
export function secaoOndeAssistir(onde) {
  const credito = '<p class="credito">Dados de streaming: JustWatch</p>';

  if (!onde.disponivel) {
    return `<p class="indisponivel">Não disponível em nenhum streaming no Brasil no momento.</p>${credito}`;
  }

  const grupos = GRUPOS_ONDE_ASSISTIR
    .filter(([chave]) => onde[chave].length > 0)
    .map(([chave, titulo]) => {
      const itens = onde[chave].map((p) => {
        const logo = urlImagem(p.logo, 'w92');
        return `<li class="provedor">${logo ? `<img src="${logo}" alt="" loading="lazy">` : ''}${escaparHtml(p.nome)}</li>`;
      });
      return `<div class="grupo"><h3>${titulo}</h3><ul>${itens.join('')}</ul></div>`;
    });

  const link = onde.link
    ? `<a href="${escaparHtml(onde.link)}" target="_blank" rel="noopener">Ver opções</a>`
    : '';

  return `${grupos.join('')}${credito}${link}`;
}

// "2020-01-15T12:00:00Z" → "15/01/2020" (ou '' se a data for inválida)
function formatarData(texto) {
  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

// Uma resenha. Se o texto for longo, mostra só o começo e um botão "Ler mais".
export function cartaoResenha(resenha) {
  const { curto, cortado } = cortarTexto(resenha.texto, LIMITE_RESENHA);
  const data = formatarData(resenha.data);

  const detalhes = [
    data ? `<span>${data}</span>` : '',
    resenha.nota !== null ? `<span class="resenha-nota">★ ${escaparHtml(resenha.nota)}/10</span>` : '',
    resenha.idioma === 'en-US' ? '<span class="etiqueta">Em inglês</span>' : '',
  ].join('');

  const botao = cortado
    ? `<button type="button" class="link-botao" data-resenha-id="${escaparHtml(resenha.id)}">Ler mais</button>`
    : '';

  return `
    <article class="resenha">
      <header>
        <h3 class="resenha-autor">${escaparHtml(resenha.autor)}</h3>
        <div class="resenha-detalhes">${detalhes}</div>
      </header>
      <p class="resenha-texto">${escaparHtml(curto)}</p>
      ${botao}
    </article>`;
}

// Mensagem para quando não há nada a mostrar (ou deu erro).
export function listaVazia(mensagem) {
  return `<p class="vazio">${escaparHtml(mensagem)}</p>`;
}
