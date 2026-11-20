// A comunidade na página do filme: nota da comunidade, Avaliações e Discussão.
// Este arquivo só liga os cliques e os formulários às funções do api.js
// e aos componentes (que montam o HTML e têm testes).

import {
  carregarAvaliacoes, salvarAvaliacao, apagarAvaliacao,
  carregarComentarios, comentar, apagarComentario,
} from './api.js';
import {
  notaComunidade, cartaoAvaliacao, formularioAvaliacao, avisoSpoiler,
  cartaoComentario, formularioComentario, pedirLogin, listaVazia,
} from './componentes.js';
import { destinoDe } from './navegacao.js';

// "localStorage" guarda pequenos textos no navegador, mesmo depois de fechar a aba.
// Usamos para lembrar que a pessoa já abriu a Discussão deste filme.
// Pode falhar (janela anônima, navegador bloqueando), então fica sempre num try/catch.
function lembrarDiscussaoAberta(chave) {
  try {
    localStorage.setItem(chave, 'sim');
  } catch {
    // sem localStorage: a pessoa só vai precisar clicar de novo da próxima vez
  }
}

function discussaoJaFoiAberta(chave) {
  try {
    return localStorage.getItem(chave) === 'sim';
  } catch {
    return false;
  }
}

// Mostra o erro dentro do formulário (ex.: "Escreva algo antes de enviar.").
function mostrarErro(formulario, erro) {
  formulario.querySelector('.form-mensagem').textContent = erro.message;
}

export function iniciarComunidade({ filmeId, usuario, avaliacoes, elementos }) {
  const destino = destinoDe(location.pathname, location.search);
  let estado = avaliacoes; // { media, total, minha, outras }
  let editando = false;

  // ---------- Avaliações ----------

  function desenharAvaliacoes() {
    elementos.nota.innerHTML = notaComunidade(estado);

    const partes = [];
    if (!usuario) partes.push(pedirLogin('avaliar', destino));
    else if (!estado.minha || editando) partes.push(formularioAvaliacao(editando ? estado.minha : null));
    if (estado.minha && !editando) partes.push(cartaoAvaliacao(estado.minha, { minha: true }));
    partes.push(...estado.outras.map((avaliacao) => cartaoAvaliacao(avaliacao)));
    if (estado.total === 0) partes.push(listaVazia('Ninguém avaliou este filme ainda.'));

    elementos.avaliacoes.innerHTML = partes.join('');
  }

  async function recarregarAvaliacoes() {
    estado = await carregarAvaliacoes(filmeId);
    editando = false;
    desenharAvaliacoes();
  }

  elementos.avaliacoes.addEventListener('submit', async (evento) => {
    const formulario = evento.target.closest('#form-avaliacao');
    if (!formulario) return;
    evento.preventDefault();
    const botao = formulario.querySelector('button[type="submit"]');
    botao.disabled = true;
    try {
      await salvarAvaliacao(filmeId, {
        nota: Number(formulario.elements.nota.value),
        texto: formulario.elements.texto.value,
      });
      await recarregarAvaliacoes();
    } catch (erro) {
      mostrarErro(formulario, erro);
      botao.disabled = false;
    }
  });

  elementos.avaliacoes.addEventListener('click', async (evento) => {
    if (evento.target.closest('[data-editar-avaliacao]')) {
      editando = true;
      desenharAvaliacoes();
      elementos.avaliacoes.querySelector('select').focus();
    } else if (evento.target.closest('[data-cancelar-edicao]')) {
      editando = false;
      desenharAvaliacoes();
    } else if (evento.target.closest('[data-apagar-avaliacao]')) {
      if (!confirm('Apagar sua avaliação?')) return;
      try {
        await apagarAvaliacao(filmeId);
        await recarregarAvaliacoes();
      } catch (erro) {
        alert(erro.message);
      }
    }
  });

  desenharAvaliacoes();

  // ---------- Discussão (com spoilers) ----------

  const chaveDiscussao = `discussao-aberta-${filmeId}`;

  function desenharDiscussao(comentarios) {
    const topo = usuario ? formularioComentario() : pedirLogin('comentar', destino);
    const lista = comentarios.length > 0
      ? comentarios.map((comentario) => cartaoComentario(comentario, { logado: Boolean(usuario) })).join('')
      : listaVazia('Ninguém comentou ainda.');
    elementos.discussao.innerHTML = `${topo}<div class="comentarios">${lista}</div>`;
  }

  async function recarregarComentarios() {
    try {
      desenharDiscussao(await carregarComentarios(filmeId));
    } catch (erro) {
      elementos.discussao.innerHTML = listaVazia(erro.message);
    }
  }

  // Só aqui os comentários são pedidos ao servidor: antes do clique, eles nem existem na página.
  async function abrirDiscussao() {
    lembrarDiscussaoAberta(chaveDiscussao);
    elementos.discussao.innerHTML = listaVazia('Carregando a discussão…');
    await recarregarComentarios();
  }

  elementos.discussao.addEventListener('click', async (evento) => {
    const alvo = evento.target;

    if (alvo.closest('[data-abrir-discussao]')) {
      abrirDiscussao();
      return;
    }

    const responder = alvo.closest('[data-responder]');
    if (responder) {
      // O campo de resposta abre embaixo do comentário (mesmo quando se responde a uma resposta).
      const area = responder.closest('.comentario').querySelector('[data-area-resposta]');
      area.innerHTML = formularioComentario({ respostaA: Number(responder.dataset.responder), nome: responder.dataset.nome });
      const campo = area.querySelector('textarea');
      campo.focus();
      campo.setSelectionRange(campo.value.length, campo.value.length); // cursor depois do "@nome "
      return;
    }

    if (alvo.closest('[data-cancelar-resposta]')) {
      alvo.closest('form').remove();
      return;
    }

    const apagar = alvo.closest('[data-apagar-comentario]');
    if (apagar) {
      if (!confirm('Apagar este comentário?')) return;
      try {
        await apagarComentario(apagar.dataset.apagarComentario);
        await recarregarComentarios();
      } catch (erro) {
        alert(erro.message);
      }
    }
  });

  elementos.discussao.addEventListener('submit', async (evento) => {
    const formulario = evento.target.closest('.form-comentario');
    if (!formulario) return;
    evento.preventDefault();
    const botao = formulario.querySelector('button[type="submit"]');
    botao.disabled = true;
    try {
      const respostaA = formulario.dataset.respostaA ? Number(formulario.dataset.respostaA) : null;
      await comentar(filmeId, { texto: formulario.elements.texto.value, respostaA });
      await recarregarComentarios();
    } catch (erro) {
      mostrarErro(formulario, erro);
      botao.disabled = false;
    }
  });

  if (discussaoJaFoiAberta(chaveDiscussao)) abrirDiscussao();
  else elementos.discussao.innerHTML = avisoSpoiler();
}
