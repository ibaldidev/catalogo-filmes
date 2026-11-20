// Funções puras que montam pedaços de HTML (como texto) a partir dos dados.
// Todo texto que vem do TMDB (inclusive os endereços de imagem) passa por
// escaparHtml antes de entrar no HTML.

import { escaparHtml, urlImagem, formatarNota, cortarTexto, estrelas } from './formatar.js';
import { linkEntrar, linkCadastrar } from './navegacao.js';

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
// Como no Letterboxd, a grade mostra só os pôsteres. O título (e o ano) aparece num
// balão ao passar o mouse ou chegar pelo teclado; leitores de tela leem o título sempre.
// O alt da imagem fica vazio de propósito: o título já está no link, não precisa repetir.
export function cartaoFilme(filme) {
  const titulo = escaparHtml(filme.titulo);
  const poster = urlImagem(filme.poster);

  const imagem = poster
    ? `<img class="cartao-poster" src="${escaparHtml(poster)}" alt="" loading="lazy">`
    : `<span class="sem-poster" aria-hidden="true">${titulo}</span>`;

  const ano = filme.ano ? ` <span class="cartao-ano">${filme.ano}</span>` : '';
  const nota = filme.nota !== null && filme.nota !== undefined
    ? `<span class="cartao-nota" title="Nota no TMDB">★ ${formatarNota(filme.nota)}</span>`
    : '';

  return `
    <a class="cartao" href="filme.html?id=${filme.id}">
      <span class="cartao-capa">${imagem}</span>
      <span class="cartao-titulo">${titulo}${ano}</span>
      ${nota}
    </a>`;
}

// Bolinha com a primeira letra do nome, no lugar da foto de perfil.
export function avatar(nome) {
  const letra = String(nome ?? '').trim().charAt(0).toUpperCase() || '?';
  return `<span class="avatar" aria-hidden="true">${escaparHtml(letra)}</span>`;
}

// Nota de 1 a 10 em estrelas verdes. O leitor de tela ouve "Nota 8 de 10".
export function notaEmEstrelas(nota) {
  const numero = escaparHtml(String(nota).replace('.', ','));
  return `<span class="estrelas"><span aria-hidden="true">${estrelas(nota)}</span><span class="so-leitor">Nota ${numero} de 10</span></span>`;
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
        return `<li class="provedor">${logo ? `<img src="${escaparHtml(logo)}" alt="" loading="lazy">` : ''}${escaparHtml(p.nome)}</li>`;
      });
      return `<div class="grupo"><h3>${titulo}</h3><ul>${itens.join('')}</ul></div>`;
    });

  const link = onde.link
    ? `<a href="${escaparHtml(onde.link)}" target="_blank" rel="noopener">Ver opções</a>`
    : '';

  return `${grupos.join('')}${credito}${link}`;
}

// "2020-01-15T12:00:00Z" → "15/01/2020" (ou '' se a data for inválida)
// As resenhas do TMDB usam a data em UTC (como na fase 1). Na comunidade, a data é
// o momento em que alguém escreveu: mostramos no fuso de quem lê ({ utc: false }),
// senão um comentário das 22h no Brasil apareceria com a data do dia seguinte.
function formatarData(texto, { utc = true } = {}) {
  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleDateString('pt-BR', utc ? { timeZone: 'UTC' } : {});
}

// Uma resenha. Se o texto for longo, mostra só o começo e um botão "Ler mais".
export function cartaoResenha(resenha) {
  const { curto, cortado } = cortarTexto(resenha.texto, LIMITE_RESENHA);
  const data = formatarData(resenha.data);

  const detalhes = [
    data ? `<span>${data}</span>` : '',
    resenha.idioma === 'en-US' ? '<span class="etiqueta">Em inglês</span>' : '',
  ].join('');

  const id = escaparHtml(resenha.id);
  const lerMais = cortado
    ? `<button type="button" class="link-botao" data-resenha-id="${id}">Ler mais</button>`
    : '';

  // Resenhas em inglês ganham o botão de traduzir. Ele começa escondido:
  // a página só mostra se o navegador tiver o tradutor embutido.
  const emIngles = resenha.idioma === 'en-US';
  const traduzir = emIngles
    ? `<button type="button" class="link-botao" data-traduzir="${id}" hidden>Traduzir para o português</button>`
    : '';
  const aviso = emIngles ? '<p class="resenha-aviso" hidden>Traduzido pelo navegador</p>' : '';

  const acoes = lerMais || traduzir ? `<div class="resenha-acoes">${lerMais}${traduzir}</div>` : '';

  const nota = resenha.nota !== null ? notaEmEstrelas(resenha.nota) : '';

  return `
    <article class="resenha">
      ${avatar(resenha.autor)}
      <div class="resenha-corpo">
        <header class="resenha-cabeca">
          <h3 class="resenha-autor">${escaparHtml(resenha.autor)}</h3>
          ${nota}
          <span class="resenha-detalhes">${detalhes}</span>
        </header>
        <p class="resenha-texto">${escaparHtml(curto)}</p>
        ${aviso}
        ${acoes}
      </div>
    </article>`;
}

// Botão de um serviço de streaming (página inicial).
// Só os serviços principais aparecem de início; os outros ficam escondidos
// até a pessoa clicar em "Ver todos os serviços".
export function chipServico(provedor) {
  const logo = urlImagem(provedor.logo, 'w92');
  return `
    <button type="button" class="chip" data-provedor="${escaparHtml(provedor.id)}" aria-pressed="false" ${provedor.principal ? '' : 'hidden'}>
      ${logo ? `<img src="${escaparHtml(logo)}" alt="" loading="lazy">` : ''}
      ${escaparHtml(provedor.nome)}
    </button>`;
}

// Parte da conta no cabeçalho: "Entrar" (visitante) ou "Olá, nome" + "Sair".
export function areaConta(usuario, destino) {
  if (!usuario) {
    return `
      <a class="link-conta" href="${escaparHtml(linkEntrar(destino))}">Entrar</a>
      <a class="link-conta" href="${escaparHtml(linkCadastrar(destino))}">Criar conta</a>`;
  }
  return `
    <span class="ola">Olá, ${escaparHtml(usuario.nome)}</span>
    <button type="button" class="link-botao" data-sair>Sair</button>`;
}

// ---------- Comunidade (página do filme) ----------

// "Comunidade: ★ 8,2 (12 avaliações)" ao lado da nota do TMDB.
// Fica no painel de notas da página do filme, embaixo da nota do TMDB.
export function notaComunidade({ media, total }) {
  if (total === 0) {
    return '<p class="painel-linha"><span class="painel-rotulo">Comunidade</span> <span class="votos">Ninguém avaliou ainda</span></p>';
  }
  const quantas = total === 1 ? '1 avaliação' : `${total} avaliações`;
  return `
    <p class="painel-linha">
      <span class="painel-rotulo">Comunidade</span>
      <span class="painel-nota">${formatarNota(media)}</span>
      <span class="estrelas" aria-hidden="true">${estrelas(media)}</span>
      <span class="votos">${quantas}</span>
    </p>`;
}

// Uma avaliação da comunidade. A da própria pessoa ganha "Editar" e "Apagar".
export function cartaoAvaliacao(avaliacao, { minha = false } = {}) {
  const data = formatarData(avaliacao.criadoEm, { utc: false });
  const detalhes = [
    data ? `<span>${data}</span>` : '',
    avaliacao.editada ? '<span>(editada)</span>' : '',
  ].join('');
  const texto = avaliacao.texto ? `<p class="resenha-texto">${escaparHtml(avaliacao.texto)}</p>` : '';
  const acoes = minha
    ? `<div class="resenha-acoes">
        <button type="button" class="link-botao" data-editar-avaliacao>Editar</button>
        <button type="button" class="link-botao" data-apagar-avaliacao>Apagar</button>
      </div>`
    : '';

  return `
    <article class="resenha">
      ${avatar(avaliacao.autor)}
      <div class="resenha-corpo">
        <header class="resenha-cabeca">
          <h3 class="resenha-autor">${escaparHtml(avaliacao.autor)}${minha ? ' <span class="etiqueta">Você</span>' : ''}</h3>
          ${notaEmEstrelas(avaliacao.nota)}
          <span class="resenha-detalhes">${detalhes}</span>
        </header>
        ${texto}
        ${acoes}
      </div>
    </article>`;
}

// Formulário para dar (ou editar) a própria avaliação.
export function formularioAvaliacao(minha) {
  const opcoes = Array.from({ length: 10 }, (_, i) => i + 1)
    .map((nota) => `<option value="${nota}"${minha?.nota === nota ? ' selected' : ''}>${estrelas(nota)} (${nota} de 10)</option>`)
    .join('');
  const cancelar = minha
    ? '<button type="button" class="link-botao" data-cancelar-edicao>Cancelar</button>'
    : '';

  return `
    <form class="formulario form-avaliacao" id="form-avaliacao">
      <label>
        Sua nota
        <select name="nota" required>
          <option value="">Escolha de 1 a 10</option>
          ${opcoes}
        </select>
      </label>
      <label>
        O que você achou? <span class="dica">Opcional. Sem spoilers: quem ainda não assistiu lê esta parte.</span>
        <textarea name="texto" maxlength="5000">${escaparHtml(minha?.texto ?? '')}</textarea>
      </label>
      <p class="form-mensagem" aria-live="polite"></p>
      <div class="resenha-acoes">
        <button type="submit" class="botao-principal">${minha ? 'Salvar alterações' : 'Publicar avaliação'}</button>
        ${cancelar}
      </div>
    </form>`;
}

// O "portão" da Discussão: nada de comentários até a pessoa clicar.
export function avisoSpoiler() {
  return `
    <div class="aviso-spoiler">
      <p>Esta área pode conter spoilers.</p>
      <button type="button" class="botao-principal" data-abrir-discussao>Já assisti, quero ver</button>
    </div>`;
}

// Botões de um comentário ou resposta.
function acoesComentario({ id, autor, meu }, podeResponder) {
  const responder = podeResponder
    ? `<button type="button" class="link-botao" data-responder="${escaparHtml(id)}" data-nome="${escaparHtml(autor)}">Responder</button>`
    : '';
  const apagar = meu
    ? `<button type="button" class="link-botao" data-apagar-comentario="${escaparHtml(id)}">Apagar</button>`
    : '';
  return responder || apagar ? `<div class="resenha-acoes">${responder}${apagar}</div>` : '';
}

function cartaoResposta(resposta, podeResponder) {
  return `
    <div class="resposta">
      <p class="comentario-topo"><strong>${escaparHtml(resposta.autor)}</strong> <span class="dica">${formatarData(resposta.criadoEm, { utc: false })}</span></p>
      <p class="resenha-texto">${escaparHtml(resposta.texto)}</p>
      ${acoesComentario(resposta, podeResponder)}
    </div>`;
}

// Um comentário da Discussão, com as respostas embaixo.
// Num comentário apagado não dá para responder (nem a ele, nem às respostas dele).
export function cartaoComentario(comentario, { logado = false } = {}) {
  const podeResponder = logado && !comentario.apagado;
  const corpo = comentario.apagado
    ? '<p class="comentario-apagado">Comentário apagado</p>'
    : `
      <p class="comentario-topo"><strong>${escaparHtml(comentario.autor)}</strong> <span class="dica">${formatarData(comentario.criadoEm, { utc: false })}</span></p>
      <p class="resenha-texto">${escaparHtml(comentario.texto)}</p>
      ${acoesComentario(comentario, podeResponder)}`;
  const respostas = comentario.respostas.length > 0
    ? `<div class="respostas">${comentario.respostas.map((r) => cartaoResposta(r, podeResponder)).join('')}</div>`
    : '';

  return `
    <article class="comentario">
      ${comentario.apagado ? '<span class="avatar avatar-vazio" aria-hidden="true"></span>' : avatar(comentario.autor)}
      <div class="resenha-corpo">
        ${corpo}
        ${respostas}
        <div data-area-resposta></div>
      </div>
    </article>`;
}

// Campo para comentar ou, com respostaA, para responder (já começando com "@nome ").
export function formularioComentario({ respostaA = null, nome = '' } = {}) {
  const respondendo = respostaA !== null;
  const inicio = respondendo && nome ? `@${nome} ` : '';
  const cancelar = respondendo
    ? '<button type="button" class="link-botao" data-cancelar-resposta>Cancelar</button>'
    : '';

  return `
    <form class="formulario form-comentario" data-resposta-a="${respondendo ? escaparHtml(respostaA) : ''}">
      <label>
        ${respondendo ? 'Sua resposta' : 'Escreva um comentário'}
        <textarea name="texto" maxlength="2000" required>${escaparHtml(inicio)}</textarea>
      </label>
      <p class="form-mensagem" aria-live="polite"></p>
      <div class="resenha-acoes">
        <button type="submit" class="botao-principal">${respondendo ? 'Responder' : 'Comentar'}</button>
        ${cancelar}
      </div>
    </form>`;
}

// "Entre para avaliar" / "Entre para comentar", voltando para esta página depois.
export function pedirLogin(acao, destino) {
  return `<p class="pedir-login"><a href="${escaparHtml(linkEntrar(destino))}">Entre para ${escaparHtml(acao)}</a></p>`;
}

// Mensagem para quando não há nada a mostrar (ou deu erro).
export function listaVazia(mensagem) {
  return `<p class="vazio">${escaparHtml(mensagem)}</p>`;
}
