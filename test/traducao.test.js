import { test } from 'node:test';
import assert from 'node:assert/strict';
import { traduzirTexto, tradutorDisponivel, criarTradutor } from '../public/js/traducao.js';

// Tradutor falso: "traduz" deixando tudo em maiúsculas e anota o que recebeu.
function criarTraduzirFalso() {
  const recebidos = [];
  const traduzir = async (trecho) => {
    recebidos.push(trecho);
    return trecho.toUpperCase();
  };
  return { traduzir, recebidos };
}

test('traduz parágrafo por parágrafo e mantém as quebras de linha', async () => {
  const { traduzir, recebidos } = criarTraduzirFalso();

  const resultado = await traduzirTexto('great film\n\nloved it\nthe end', traduzir);

  assert.equal(resultado, 'GREAT FILM\n\nLOVED IT\nTHE END');
  assert.deepEqual(recebidos, ['great film', 'loved it', 'the end']); // em ordem, sem as linhas vazias
});

test('linhas só com espaços não vão para o tradutor', async () => {
  const { traduzir, recebidos } = criarTraduzirFalso();

  const resultado = await traduzirTexto('a\n   \nb', traduzir);

  assert.equal(resultado, 'A\n   \nB');
  assert.deepEqual(recebidos, ['a', 'b']);
});

// "Ambiente" falso: faz o papel do navegador (globalThis) nos testes.
function ambienteCom(disponibilidade) {
  const pedidos = [];
  return {
    pedidos,
    Translator: {
      async availability(opcoes) {
        pedidos.push(opcoes);
        if (disponibilidade instanceof Error) throw disponibilidade;
        return disponibilidade;
      },
    },
  };
}

test('tradutorDisponivel: navegador sem tradutor', async () => {
  assert.equal(await tradutorDisponivel({}), false);
});

test('tradutorDisponivel: indisponível, para baixar, pronto e com erro', async () => {
  assert.equal(await tradutorDisponivel(ambienteCom('unavailable')), false);
  assert.equal(await tradutorDisponivel(ambienteCom('downloadable')), true);
  assert.equal(await tradutorDisponivel(ambienteCom('available')), true);
  assert.equal(await tradutorDisponivel(ambienteCom(new Error('falhou'))), false);
});

test('tradutorDisponivel pergunta por inglês → português', async () => {
  const ambiente = ambienteCom('available');
  await tradutorDisponivel(ambiente);

  assert.deepEqual(ambiente.pedidos[0], { sourceLanguage: 'en', targetLanguage: 'pt' });
});

test('criarTradutor pede en → pt e repassa o progresso do download', async () => {
  let opcoesRecebidas;
  const tradutorFalso = { translate: async (t) => t };
  const ambiente = {
    Translator: {
      async create(opcoes) {
        opcoesRecebidas = opcoes;
        // Simula o Chrome avisando o progresso do download do pacote de idioma.
        const ouvintes = {};
        opcoes.monitor({ addEventListener: (nome, fn) => { ouvintes[nome] = fn; } });
        ouvintes.downloadprogress({ loaded: 0.4 });
        return tradutorFalso;
      },
    },
  };
  const progresso = [];

  const tradutor = await criarTradutor(ambiente, (fracao) => progresso.push(fracao));

  assert.equal(tradutor, tradutorFalso);
  assert.equal(opcoesRecebidas.sourceLanguage, 'en');
  assert.equal(opcoesRecebidas.targetLanguage, 'pt');
  assert.deepEqual(progresso, [0.4]);
});
