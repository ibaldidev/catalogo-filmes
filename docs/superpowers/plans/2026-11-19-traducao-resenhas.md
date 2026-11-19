# Tradução das resenhas: plano de implementação

**Objetivo:** adicionar um botão "Traduzir para o português" nas resenhas em inglês, usando o tradutor embutido do Chrome.

**Spec:** `docs/superpowers/specs/2026-11-19-traducao-resenhas-design.md`

**Tecnologia:** Translator API do Chrome e JavaScript puro, com testes no `node --test` usando um tradutor falso.

## Restrições globais
- Nenhuma chamada nova ao servidor e nenhuma dependência nova.
- Todo texto vindo de fora entra na página por `textContent` ou `escaparHtml`.
- Os textos que aparecem na tela são exatamente estes:
  - "Traduzir para o português"
  - "Traduzindo…"
  - "Baixando tradutor… N%"
  - "Traduzido pelo navegador"
  - "Ver original"
  - "Não foi possível traduzir agora. Tentar de novo"

## Foco da revisão
1. Navegador sem `Translator`: nenhum botão aparece e nada quebra.
2. A chamada `availability` lança um erro: o resultado é tratado como "indisponível".
3. Resenha com linhas em branco: os parágrafos são mantidos.
4. "Ler mais" e "Traduzir" na mesma resenha: os dois funcionam, em qualquer ordem.
5. Falha no meio da tradução: o botão volta e permite tentar de novo.

---

### Task 1 (Tarefa 1): módulo de tradução

**Arquivos:**
- Criar `public/js/traducao.js`.
- Testar em `test/traducao.test.js`.

**O que este módulo oferece:**
- `traduzirTexto(texto, traduzir)`, que devolve `Promise<string>`.
  - `traduzir` é uma função `(trecho) => Promise<string>`.
  - O texto é dividido nas quebras de linha, e as quebras são mantidas.
  - Trechos em branco não são enviados para o tradutor.
  - Os trechos são traduzidos em ordem.
- `tradutorDisponivel(ambiente = globalThis)`, que devolve `Promise<boolean>`.
  - É `false` sem `ambiente.Translator`, quando a disponibilidade é `'unavailable'` ou quando a chamada lança um erro.
- `criarTradutor(ambiente, aoBaixar)` chama `ambiente.Translator.create` com `en` como idioma de origem e `pt` como idioma de destino. O progresso do download (`downloadprogress`, campo `e.loaded`, de 0 a 1) é repassado para `aoBaixar`.

**Testes:**
1. Os parágrafos são mantidos e as linhas em branco não são enviadas.
2. Os trechos saem em ordem.
3. A disponibilidade cobre quatro casos: sem `Translator`, `'unavailable'`, `'downloadable'` e erro.
4. A disponibilidade pede en→pt.
5. `criarTradutor` repassa o progresso.

**Passos:** escrever os testes, ver falhar, implementar, ver passar e fazer o commit.

### Task 2 (Tarefa 2): botão na resenha e ligação na página

**Arquivos:**
- Modificar `public/js/componentes.js` (`cartaoResenha`).
- Modificar `public/js/filme.js`.
- Modificar `public/css/estilo.css`.
- Testar em `test/componentes.test.js`.

**O que muda:**
- `cartaoResenha` coloca os botões dentro de `<div class="resenha-acoes">`.
- Uma resenha `en-US` ganha:
  - `<button ... data-traduzir="ID" hidden>Traduzir para o português</button>`;
  - `<p class="resenha-aviso" hidden>Traduzido pelo navegador</p>`.
- Uma resenha `pt-BR` não ganha nenhum dos dois.
- O "Ler mais" passa a encontrar o texto com `closest('.resenha')`, e não mais com `previousElementSibling`.
- O `filme.js` mostra os botões de traduzir quando `tradutorDisponivel()` for verdadeiro. Ele cria um único tradutor, só no primeiro clique, e guarda as traduções num `Map`.

**Testes:**
1. A resenha em inglês tem o botão e o aviso, os dois escondidos.
2. A resenha em português não tem nenhum dos dois.

**Verificação manual (pelo Gabryel, no Chrome do computador):**
1. Abrir uma resenha em inglês.
2. Clicar em "Traduzir".
3. Clicar em "Ver original".
4. Testar "Ler mais" antes e depois de traduzir.
