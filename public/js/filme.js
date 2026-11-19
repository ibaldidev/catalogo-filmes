// Página do filme: lê o id da URL (filme.html?id=550), busca os dados e monta a página.

import { carregarFilme } from './api.js';
import { secaoOndeAssistir, cartaoResenha, listaVazia } from './componentes.js';
import { escaparHtml, urlImagem, formatarNota, formatarDuracao } from './formatar.js';
import { tradutorDisponivel, criarTradutor, traduzirTexto } from './traducao.js';

const area = document.querySelector('#filme');

// Um único tradutor para a página inteira, criado só no primeiro clique em "Traduzir".
let tradutorPromessa = null;
const traducoes = new Map(); // id da resenha → texto traduzido (para não traduzir duas vezes)

// Monta o HTML da página inteira a partir dos dados do filme.
function paginaDoFilme(filme) {
  const titulo = escaparHtml(filme.titulo);
  const poster = urlImagem(filme.poster, 'w500');

  const imagem = poster
    ? `<img class="filme-poster" src="${escaparHtml(poster)}" alt="Pôster de ${titulo}">`
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

// "Ler mais": troca o trecho pelo texto completo.
function mostrarTextoCompleto(botao, filme) {
  const resenha = filme.resenhas.find((r) => r.id === botao.dataset.resenhaId);
  // textContent nunca vira HTML. (Depois de traduzir, este botão já não existe.)
  botao.closest('.resenha').querySelector('.resenha-texto').textContent = resenha.texto;
  botao.remove();
}

// "Traduzir para o português" ↔ "Ver original".
async function alternarTraducao(botao, filme) {
  const cartao = botao.closest('.resenha');
  const paragrafo = cartao.querySelector('.resenha-texto');
  const aviso = cartao.querySelector('.resenha-aviso');
  const resenha = filme.resenhas.find((r) => r.id === botao.dataset.traduzir);

  // A tradução e o original sempre aparecem inteiros, então o "Ler mais" deixa de ser útil.
  cartao.querySelector('[data-resenha-id]')?.remove();

  // Já está traduzida: volta para o original.
  if (cartao.dataset.traduzida === 'sim') {
    paragrafo.textContent = resenha.texto;
    aviso.hidden = true;
    cartao.dataset.traduzida = 'não';
    botao.textContent = 'Traduzir para o português';
    return;
  }

  botao.disabled = true;
  botao.textContent = 'Traduzindo…';
  try {
    if (!traducoes.has(resenha.id)) {
      tradutorPromessa ??= criarTradutor(globalThis, (fracao) => {
        botao.textContent = `Baixando tradutor… ${Math.round(fracao * 100)}%`;
      });
      const tradutor = await tradutorPromessa;
      botao.textContent = 'Traduzindo…';
      traducoes.set(resenha.id, await traduzirTexto(resenha.texto, (trecho) => tradutor.translate(trecho)));
    }
    paragrafo.textContent = traducoes.get(resenha.id);
    aviso.hidden = false;
    cartao.dataset.traduzida = 'sim';
    botao.textContent = 'Ver original';
  } catch (erro) {
    console.error(erro);
    tradutorPromessa = null; // na próxima tentativa, cria o tradutor de novo
    botao.textContent = 'Não foi possível traduzir agora. Tentar de novo';
  } finally {
    botao.disabled = false;
  }
}

async function iniciar() {
  const id = new URLSearchParams(location.search).get('id');
  if (!id) {
    area.innerHTML = listaVazia('Filme não encontrado.');
    return;
  }

  // 1) Buscar os dados. Se falhar, a mensagem vem do servidor (ex.: "Filme não encontrado.").
  let filme;
  try {
    filme = await carregarFilme(id);
  } catch (erro) {
    area.innerHTML = listaVazia(erro.message);
    return;
  }

  // 2) Montar a página. Se algo inesperado quebrar aqui, a pessoa vê uma mensagem
  //    clara (e o detalhe técnico vai para o console, onde quem programa olha).
  try {
    document.title = `${filme.titulo} | Em Cartaz`;
    area.innerHTML = paginaDoFilme(filme);

    // Um único ouvinte para todos os botões das resenhas ("Ler mais" e "Traduzir").
    const areaResenhas = document.querySelector('#resenhas');
    areaResenhas.addEventListener('click', (evento) => {
      const lerMais = evento.target.closest('[data-resenha-id]');
      if (lerMais) mostrarTextoCompleto(lerMais, filme);

      const traduzir = evento.target.closest('[data-traduzir]');
      if (traduzir) alternarTraducao(traduzir, filme);
    });

    // Só mostra os botões de traduzir se o navegador tiver o tradutor embutido.
    if (await tradutorDisponivel()) {
      for (const botao of areaResenhas.querySelectorAll('[data-traduzir]')) botao.hidden = false;
    }
  } catch (erro) {
    console.error(erro);
    area.innerHTML = listaVazia('Não foi possível mostrar este filme. Tente recarregar a página.');
  }
}

iniciar();
