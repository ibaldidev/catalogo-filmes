// Página inicial: liga os botões da tela às funções que buscam e mostram os filmes.

import { carregarProvedores, descobrir } from './api.js';
import { cartaoFilme, chipServico, listaVazia } from './componentes.js';
import { urlImagem } from './formatar.js';

// Elementos da página
const areaDestaques = document.querySelector('#destaques');
const palcoImagem = document.querySelector('#palco-imagem');
const palcoCredito = document.querySelector('#palco-credito');
const grade = document.querySelector('#grade');
const botaoMais = document.querySelector('#carregar-mais');
const areaServicos = document.querySelector('#servicos');
const botaoVerTodos = document.querySelector('#ver-todos');
const botoesOrdem = document.querySelectorAll('[data-ordem]');

// Estado: o que está escolhido na tela agora
const estado = {
  ordem: 'nota',
  provedores: new Set(), // ids dos serviços marcados
  pagina: 1,
  totalPaginas: 1,
};

// Cada pedido ganha um número. Se a pessoa clicar rápido em vários filtros,
// as respostas antigas que chegarem atrasadas são ignoradas.
let pedidoAtual = 0;

// Busca a página "estado.pagina". Se "acrescentar" for falso, troca a lista inteira.
async function carregarFilmes({ acrescentar }) {
  const numeroDoPedido = ++pedidoAtual;
  botaoMais.disabled = true;
  if (!acrescentar) grade.innerHTML = listaVazia('Carregando…');

  try {
    const resultado = await descobrir({
      ordem: estado.ordem,
      provedores: [...estado.provedores],
      pagina: estado.pagina,
    });
    if (numeroDoPedido !== pedidoAtual) return; // chegou atrasado: ignora

    estado.totalPaginas = resultado.totalPaginas;
    const html = resultado.filmes.map(cartaoFilme).join('');

    if (acrescentar) {
      grade.insertAdjacentHTML('beforeend', html);
    } else {
      grade.innerHTML = html || listaVazia('Nenhum filme encontrado com esses filtros. Tente marcar outros serviços.');
    }
    botaoMais.hidden = estado.pagina >= estado.totalPaginas;
    botaoMais.textContent = 'Carregar mais filmes';
  } catch (erro) {
    if (numeroDoPedido !== pedidoAtual) return;
    if (acrescentar) {
      estado.pagina -= 1; // volta, para a pessoa tentar de novo
      botaoMais.textContent = 'Não carregou. Tentar de novo';
    } else {
      grade.innerHTML = listaVazia(erro.message);
      botaoMais.hidden = true;
    }
  } finally {
    if (numeroDoPedido === pedidoAtual) botaoMais.disabled = false;
  }
}

// Recomeça da página 1 (quando muda a ordem ou um filtro).
function recomecar() {
  estado.pagina = 1;
  carregarFilmes({ acrescentar: false });
}

// A imagem grande do topo: uma cena do filme. Ela começa invisível e aparece
// suavemente quando termina de baixar (a classe "carregada" liga a transição no CSS).
function mostrarFundo(filme) {
  const imagem = new Image();
  imagem.alt = ''; // só decoração: o nome do filme aparece no crédito ao lado
  imagem.className = 'palco-foto';
  imagem.addEventListener('load', () => imagem.classList.add('carregada'));
  imagem.src = urlImagem(filme.fundo, 'w1280');
  palcoImagem.append(imagem);

  // textContent nunca vira HTML, então o título do TMDB entra com segurança.
  palcoCredito.textContent = filme.ano ? `${filme.titulo} (${filme.ano})` : filme.titulo;
  palcoCredito.href = `filme.html?id=${filme.id}`;
  palcoCredito.hidden = false;
}

// Os 6 pôsteres grandes logo abaixo do topo: os filmes mais populares agora.
// O mais popular que tiver imagem de cena vira o fundo do topo.
async function mostrarDestaques() {
  try {
    const { filmes } = await descobrir({ ordem: 'populares', provedores: [], pagina: 1 });
    areaDestaques.innerHTML = filmes.slice(0, 6).map(cartaoFilme).join('');
    const comFundo = filmes.find((filme) => filme.fundo);
    if (comFundo) mostrarFundo(comFundo);
  } catch {
    // Sem os destaques, a página continua: o catálogo logo abaixo tem a sua própria mensagem de erro.
    areaDestaques.closest('section').hidden = true;
  }
}

async function mostrarServicos() {
  try {
    const provedores = await carregarProvedores();
    areaServicos.innerHTML = provedores.map(chipServico).join('');
    // O servidor marca quais são "principais"; os outros começam escondidos.
    botaoVerTodos.hidden = provedores.every((p) => p.principal);
  } catch {
    // Sem a lista de serviços, a página continua funcionando, só sem o filtro.
  }
}

// ---------- Eventos (o que acontece quando a pessoa clica) ----------

for (const botao of botoesOrdem) {
  botao.addEventListener('click', () => {
    if (botao.dataset.ordem === estado.ordem) return;
    estado.ordem = botao.dataset.ordem;
    for (const b of botoesOrdem) b.setAttribute('aria-pressed', String(b === botao));
    recomecar();
  });
}

// Um único "ouvinte" na área dos serviços cuida de todos os botões dentro dela.
areaServicos.addEventListener('click', (evento) => {
  const chip = evento.target.closest('[data-provedor]');
  if (!chip) return;
  const id = Number(chip.dataset.provedor);
  const marcado = !estado.provedores.has(id);
  if (marcado) estado.provedores.add(id);
  else estado.provedores.delete(id);
  chip.setAttribute('aria-pressed', String(marcado));
  recomecar();
});

botaoVerTodos.addEventListener('click', () => {
  for (const chip of areaServicos.querySelectorAll('[hidden]')) chip.hidden = false;
  botaoVerTodos.hidden = true;
});

botaoMais.addEventListener('click', () => {
  estado.pagina += 1;
  carregarFilmes({ acrescentar: true });
});

// ---------- Começo ----------
mostrarDestaques();
mostrarServicos();
carregarFilmes({ acrescentar: false });
