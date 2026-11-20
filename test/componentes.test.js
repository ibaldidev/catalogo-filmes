import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cartaoFilme, listaVazia, secaoOndeAssistir, cartaoResenha, chipServico, areaConta,
  notaComunidade, cartaoAvaliacao, formularioAvaliacao, avisoSpoiler, cartaoComentario, formularioComentario, pedirLogin,
} from '../public/js/componentes.js';

const semNada = { disponivel: false, link: null, assinatura: [], gratis: [], anuncios: [], aluguel: [], compra: [] };

test('onde assistir indisponível', () => {
  const html = secaoOndeAssistir(semNada);

  assert.ok(html.includes('Não disponível em nenhum streaming no Brasil no momento.'));
  assert.ok(html.includes('Dados de streaming: JustWatch'));
  assert.ok(!html.includes('Ver opções'));
});

test('onde assistir com grupos', () => {
  const html = secaoOndeAssistir({
    ...semNada,
    disponivel: true,
    link: 'https://www.themoviedb.org/movie/550/watch?locale=BR',
    assinatura: [{ id: 8, nome: 'Netflix', logo: '/n.jpg' }],
    aluguel: [{ id: 2, nome: 'Apple TV', logo: null }],
  });

  assert.ok(html.includes('Incluso na assinatura'));
  assert.ok(html.includes('Netflix'));
  assert.ok(html.includes('https://image.tmdb.org/t/p/w92/n.jpg'));
  assert.ok(html.includes('Aluguel'));
  assert.ok(html.includes('Apple TV'));
  assert.ok(!html.includes('Compra'));
  assert.ok(!html.includes('Grátis'));
  assert.ok(html.includes('Dados de streaming: JustWatch'));
  assert.ok(html.includes('href="https://www.themoviedb.org/movie/550/watch?locale=BR"'));
  assert.ok(!html.includes('Não disponível'));
  assert.ok(!html.includes('null'));
});

test('onde assistir grátis e com anúncios têm títulos próprios', () => {
  const html = secaoOndeAssistir({
    ...semNada,
    disponivel: true,
    gratis: [{ id: 1, nome: 'TV Livre', logo: null }],
    anuncios: [{ id: 2, nome: 'Pluto TV', logo: null }],
  });

  assert.ok(html.includes('>Grátis<'));
  assert.ok(html.includes('Grátis com anúncios'));
});

const resenhaBase = { id: 'r1', autor: 'Ana', texto: 'Ótimo filme.', idioma: 'pt-BR', nota: 9, data: '2020-01-15T12:00:00Z' };

test('resenha em português, curta e com nota', () => {
  const html = cartaoResenha(resenhaBase);

  assert.ok(html.includes('Ana'));
  assert.ok(html.includes('Ótimo filme.'));
  assert.ok(html.includes('15/01/2020'));
  assert.ok(html.includes('9'));
  assert.ok(!html.includes('Em inglês'));
  assert.ok(!html.includes('Ler mais'));
});

test('resenha em inglês e longa', () => {
  const html = cartaoResenha({ ...resenhaBase, idioma: 'en-US', texto: 'a'.repeat(700) });

  assert.ok(html.includes('Em inglês'));
  assert.ok(html.includes('Ler mais'));
  assert.ok(html.includes('data-resenha-id="r1"'));
  assert.ok(!html.includes('a'.repeat(601)));
});

test('resenha escapa HTML', () => {
  const html = cartaoResenha({ ...resenhaBase, autor: '<img src=x onerror=alert(1)>', texto: '<script>x</script>' });

  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes('<script>'));
});

test('resenha sem nota e com data inválida', () => {
  const html = cartaoResenha({ ...resenhaBase, nota: null, data: 'xyz' });

  assert.ok(!html.includes('null'));
  assert.ok(!html.includes('Invalid Date'));
});

test('cartaoFilme completo', () => {
  const html = cartaoFilme({ id: 550, titulo: 'Clube da Luta', ano: 1999, poster: '/a.jpg', nota: 8.4, votos: 1 });

  assert.ok(html.includes('href="filme.html?id=550"'));
  assert.ok(html.includes('Clube da Luta'));
  assert.ok(html.includes('1999'));
  assert.ok(html.includes('8,4'));
  assert.ok(html.includes('https://image.tmdb.org/t/p/w342/a.jpg'));
  assert.ok(!html.includes('sem-poster'));
});

test('cartaoFilme com campos vazios e HTML no título', () => {
  const html = cartaoFilme({ id: 1, titulo: '<b>X</b>', ano: null, poster: null, nota: null, votos: 0 });

  assert.ok(html.includes('&lt;b&gt;X'));
  assert.ok(html.includes('sem-poster'));
  assert.ok(!html.includes('<b>'));
  assert.ok(!html.includes('null'));
  assert.ok(!html.includes('undefined'));
});

test('listaVazia escapa a mensagem', () => {
  const html = listaVazia('<i>nada</i>');

  assert.ok(html.includes('&lt;i&gt;nada'));
  assert.ok(!html.includes('<i>'));
});

test('nota da resenha usa vírgula', () => {
  const html = cartaoResenha({ ...resenhaBase, nota: 7.5 });

  assert.ok(html.includes('7,5/10'));
  assert.ok(!html.includes('7.5'));
});

test('caminho de imagem com aspas não quebra o HTML', () => {
  const caminho = '/a.jpg" onerror="alert(1)';
  const cartao = cartaoFilme({ id: 1, titulo: 'X', ano: null, poster: caminho, nota: null, votos: 0 });
  const onde = secaoOndeAssistir({ ...semNada, disponivel: true, assinatura: [{ id: 8, nome: 'N', logo: caminho }] });

  for (const html of [cartao, onde]) {
    assert.ok(!html.includes('" onerror="'));
    assert.ok(html.includes('&quot; onerror=&quot;'));
  }
});

test('chipServico: principal aparece, o resto começa escondido', () => {
  const principal = chipServico({ id: 8, nome: 'Netflix', logo: '/n.jpg', principal: true });
  const outro = chipServico({ id: 2, nome: 'Apple TV', logo: null, principal: false });

  assert.ok(principal.includes('data-provedor="8"'));
  assert.ok(principal.includes('https://image.tmdb.org/t/p/w92/n.jpg'));
  assert.ok(!principal.includes('hidden'));
  assert.ok(outro.includes('hidden'));
  assert.ok(!outro.includes('null'));
});

test('chipServico escapa nome e logo', () => {
  const html = chipServico({ id: 1, nome: '<b>X</b>', logo: '/a.jpg" onerror="x', principal: true });

  assert.ok(html.includes('&lt;b&gt;X'));
  assert.ok(!html.includes('<b>'));
  assert.ok(!html.includes('" onerror="'));
});

test('resenha em inglês tem botão de traduzir e aviso, os dois escondidos', () => {
  const html = cartaoResenha({ ...resenhaBase, idioma: 'en-US' });

  assert.match(html, /<button[^>]*data-traduzir="r1"[^>]*hidden[^>]*>Traduzir para o português<\/button>/);
  assert.match(html, /<p class="resenha-aviso" hidden>Traduzido pelo navegador<\/p>/);
  assert.ok(html.includes('class="resenha-acoes"'));
});

test('resenha em português não tem botão de traduzir', () => {
  const html = cartaoResenha(resenhaBase);

  assert.ok(!html.includes('data-traduzir'));
  assert.ok(!html.includes('Traduzido pelo navegador'));
});

test('areaConta sem login mostra Entrar com volta', () => {
  const html = areaConta(null, 'filme.html?id=550');

  assert.ok(html.includes('href="entrar.html?volta=filme.html%3Fid%3D550"'));
  assert.ok(html.includes('>Entrar<'));
  assert.ok(!html.includes('Sair'));
});

test('areaConta com login escapa o nome e mostra Sair', () => {
  const html = areaConta({ id: 1, nome: '<b>x</b>' }, 'index.html');

  assert.ok(html.includes('Olá, &lt;b&gt;x&lt;/b&gt;'));
  assert.ok(!html.includes('<b>'));
  assert.match(html, /<button[^>]*data-sair[^>]*>Sair<\/button>/);
  assert.ok(!html.includes('Entrar'));
});

// ---------- Comunidade ----------

// Tira as tags e junta os espaços, para comparar só o texto que aparece na tela.
const textoVisivel = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

test('notaComunidade: vazia, singular e plural com vírgula', () => {
  assert.equal(textoVisivel(notaComunidade({ media: null, total: 0 })), 'Ainda sem avaliações da comunidade');
  assert.equal(textoVisivel(notaComunidade({ media: 7, total: 1 })), 'Comunidade: ★ 7,0 (1 avaliação)');
  assert.equal(textoVisivel(notaComunidade({ media: 8.2, total: 12 })), 'Comunidade: ★ 8,2 (12 avaliações)');
});

const avaliacaoBase = { id: 1, autor: 'Ana', nota: 8, texto: 'Gostei.', criadoEm: '2026-11-20T12:00:00.000Z', editada: false };

test('cartaoAvaliacao escapa texto e autor; botões só na minha', () => {
  const html = cartaoAvaliacao({ ...avaliacaoBase, autor: '<i>Ana</i>', texto: '<script>x</script>' });

  assert.ok(html.includes('&lt;i&gt;Ana'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>') && !html.includes('<i>'));
  assert.ok(html.includes('★ 8/10'));
  assert.ok(html.includes('20/11/2026'));
  assert.ok(!html.includes('data-editar-avaliacao'));
  assert.ok(!html.includes('(editada)'));

  const minha = cartaoAvaliacao({ ...avaliacaoBase, editada: true }, { minha: true });
  assert.ok(minha.includes('data-editar-avaliacao'));
  assert.ok(minha.includes('data-apagar-avaliacao'));
  assert.ok(minha.includes('(editada)'));
});

test('cartaoAvaliacao sem texto não mostra parágrafo vazio', () => {
  const html = cartaoAvaliacao({ ...avaliacaoBase, texto: '' });

  assert.ok(!html.includes('resenha-texto'));
});

test('formularioAvaliacao novo e editando', () => {
  const novo = formularioAvaliacao(null);
  for (let nota = 1; nota <= 10; nota += 1) assert.ok(novo.includes(`<option value="${nota}">${nota}</option>`));
  assert.ok(novo.includes('Publicar avaliação'));
  assert.ok(novo.includes('maxlength="5000"'));
  assert.ok(!novo.includes('selected'));

  const editando = formularioAvaliacao({ ...avaliacaoBase, nota: 6, texto: '</textarea><b>x</b>' });
  assert.ok(editando.includes('<option value="6" selected>6</option>'));
  assert.ok(editando.includes('&lt;/textarea&gt;&lt;b&gt;x'));
  assert.ok(editando.includes('Salvar alterações'));
  assert.ok(editando.includes('data-cancelar-edicao'));
});

test('avisoSpoiler tem o botão de abrir', () => {
  const html = avisoSpoiler();

  assert.ok(html.includes('Esta área pode conter spoilers.'));
  assert.match(html, /<button[^>]*data-abrir-discussao[^>]*>Já assisti, quero ver<\/button>/);
});

const resposta = { id: 2, autor: 'Bia', texto: 'Concordo', criadoEm: '2026-11-20T12:00:00.000Z', meu: false, respostaA: 1 };
const comentarioBase = {
  id: 1, autor: 'Ana', texto: 'O final!', apagado: false, criadoEm: '2026-11-20T12:00:00.000Z', meu: false, respostas: [resposta],
};

test('cartaoComentario: respostas, Responder só com login, Apagar só no meu', () => {
  const visitante = cartaoComentario(comentarioBase, { logado: false });
  assert.ok(visitante.includes('O final!') && visitante.includes('Concordo'));
  assert.ok(!visitante.includes('data-responder'));
  assert.ok(!visitante.includes('data-apagar-comentario'));

  const logado = cartaoComentario({ ...comentarioBase, meu: true }, { logado: true });
  assert.ok(logado.includes('data-responder="1"'));
  assert.ok(logado.includes('data-responder="2"')); // dá para responder a uma resposta
  assert.ok(logado.includes('data-apagar-comentario="1"'));
  assert.ok(!logado.includes('data-apagar-comentario="2"')); // a resposta é da Bia
});

test('cartaoComentario apagado', () => {
  const html = cartaoComentario({ ...comentarioBase, apagado: true, autor: null, texto: null }, { logado: true });

  assert.ok(html.includes('Comentário apagado'));
  assert.ok(html.includes('Concordo')); // as respostas continuam
  assert.ok(!html.includes('data-responder')); // não dá para responder a um comentário apagado
  assert.ok(!html.includes('null'));
});

test('cartaoComentario escapa texto e nome, inclusive em data-nome', () => {
  const html = cartaoComentario({ ...comentarioBase, autor: '"><img src=x>', texto: '<b>oi</b>', respostas: [] }, { logado: true });

  assert.ok(!html.includes('<img') && !html.includes('<b>'));
  assert.ok(html.includes('data-nome="&quot;&gt;&lt;img src=x&gt;"'));
});

test('formularioComentario: novo e resposta com @nome', () => {
  const novo = formularioComentario();
  assert.ok(novo.includes('maxlength="2000"'));
  assert.ok(novo.includes('>Comentar<'));
  assert.ok(novo.includes('data-resposta-a=""'));

  const respondendo = formularioComentario({ respostaA: 2, nome: '<b>Bia</b>' });
  assert.ok(respondendo.includes('data-resposta-a="2"'));
  assert.ok(respondendo.includes('@&lt;b&gt;Bia&lt;/b&gt; </textarea>'));
  assert.ok(respondendo.includes('data-cancelar-resposta'));
});

test('pedirLogin usa linkEntrar com o destino', () => {
  const html = pedirLogin('avaliar', 'filme.html?id=550');

  assert.ok(html.includes('href="entrar.html?volta=filme.html%3Fid%3D550"'));
  assert.ok(html.includes('>Entre para avaliar<'));
});

test('datas da comunidade usam o fuso de quem lê (não UTC)', () => {
  process.env.TZ = 'America/Sao_Paulo';
  const noite = '2026-11-21T01:00:00.000Z'; // em Brasília: 20/11 às 22h

  const comentario = cartaoComentario({ ...comentarioBase, criadoEm: noite, respostas: [{ ...resposta, criadoEm: noite }] });
  assert.equal(comentario.match(/20\/11\/2026/g)?.length, 2);
  assert.ok(!comentario.includes('21/11/2026'));
  assert.ok(cartaoAvaliacao({ ...avaliacaoBase, criadoEm: noite }).includes('20/11/2026'));
});
