// Página do filme: lê o id da URL (filme.html?id=550), busca os dados e monta a página.

import { carregarFilme } from './api.js';
import { secaoOndeAssistir, cartaoResenha, listaVazia } from './componentes.js';
import { escaparHtml, urlImagem, formatarNota, formatarDuracao } from './formatar.js';

const area = document.querySelector('#filme');

// Monta o HTML da página inteira a partir dos dados do filme.
function paginaDoFilme(filme) {
  const titulo = escaparHtml(filme.titulo);
  const poster = urlImagem(filme.poster, 'w500');

  const imagem = poster
    ? `<img class="filme-poster" src="${poster}" alt="Pôster de ${titulo}">`
    : '<div class="filme-poster sem-poster">Sem pôster</div>';

  // Só entram os detalhes que existem (nada de "null" na tela).
  const detalhes = [filme.ano, formatarDuracao(filme.duracaoMin), filme.generos.map(escaparHtml).join(', ')]
    .filter(Boolean)
    .map((d) => `<span>${d}</span>`)
    .join('');

  const votos = filme.votos > 0 ? ` <span class="votos">(${filme.votos.toLocaleString('pt-BR')} votos)</span>` : '';

  const resenhas = filme.resenhas.length > 0
    ? filme.resenhas.map(cartaoResenha).join('')
    : listaVazia('Ainda não há resenhas para este filme.');

  return `
    <div class="filme-topo">
      ${imagem}
      <div class="filme-info">
        <h1 class="filme-titulo">${titulo}</h1>
        <div class="filme-detalhes">${detalhes}</div>
        <p class="filme-nota">★ ${formatarNota(filme.nota)}${votos}</p>
        <p class="filme-sinopse">${escaparHtml(filme.sinopse ?? 'Sinopse não disponível.')}</p>
      </div>
    </div>

    <section class="secao" aria-labelledby="titulo-onde">
      <h2 id="titulo-onde">Onde assistir</h2>
      ${secaoOndeAssistir(filme.ondeAssistir)}
    </section>

    <section class="secao" aria-labelledby="titulo-resenhas">
      <h2 id="titulo-resenhas">Resenhas</h2>
      <div class="resenhas" id="resenhas">${resenhas}</div>
    </section>`;
}

async function iniciar() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) {
    area.innerHTML = listaVazia('Filme não encontrado.');
    return;
  }

  try {
    const filme = await carregarFilme(id);
    document.title = `${filme.titulo} | Em Cartaz`;
    area.innerHTML = paginaDoFilme(filme);

    // "Ler mais": um único ouvinte para todos os botões das resenhas.
    document.querySelector('#resenhas').addEventListener('click', (evento) => {
      const botao = evento.target.closest('[data-resenha-id]');
      if (!botao) return;
      const resenha = filme.resenhas.find((r) => r.id === botao.dataset.resenhaId);
      botao.previousElementSibling.textContent = resenha.texto; // textContent nunca vira HTML
      botao.remove();
    });
  } catch (erro) {
    area.innerHTML = listaVazia(erro.message);
  }
}

iniciar();
