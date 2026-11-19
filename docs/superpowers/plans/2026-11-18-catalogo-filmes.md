# Catálogo de Filmes no Streaming — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** Um site responsivo, em pt-BR, que mostra os melhores filmes no streaming no Brasil, permite buscar um filme e mostra onde assisti-lo, com nota e resenhas do TMDB.

**Arquitetura:** Um servidor Node.js + Express guarda o token do TMDB, expõe rotas `/api/...` que devolvem um JSON simplificado e serve os arquivos estáticos de `public/`. O navegador usa HTML, CSS e JavaScript puro (módulos ES), com três páginas HTML separadas: início, busca e filme.

**Tecnologias:** Node.js v26 (`fetch` nativo, `--env-file`, `node --test`), Express 5, HTML/CSS/JS sem framework e sem ferramenta de build.

**Spec:** [docs/superpowers/specs/2026-11-18-catalogo-filmes-design.md](../specs/2026-11-18-catalogo-filmes-design.md)

## Restrições globais

- O token do TMDB fica só em `.env` (variável `TMDB_TOKEN`), que está no `.gitignore`. O navegador nunca chama `api.themoviedb.org`, só `/api/...` e `image.tmdb.org`.
- Todas as chamadas ao TMDB usam `language=pt-BR` e `watch_region=BR` quando o parâmetro se aplica.
- "Melhor agora" usa `with_watch_monetization_types=flatrate`, `sort_by=vote_average.desc` e `vote_count.gte=300`. "Populares agora" usa `sort_by=popularity.desc`, sem mínimo de votos.
- Vários provedores são combinados com OU: `with_watch_providers=8|119`.
- A página é limitada a 1..500, que é o máximo do TMDB.
- Provedores principais, nesta ordem: Netflix, Prime Video, Max, Disney+, Globoplay, Apple TV+, Paramount+.
- O rodapé de todas as páginas tem o logo do TMDB e o texto "Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB." Junto de toda informação de onde assistir aparece "Dados de streaming: JustWatch".
- Todo texto vindo do TMDB que entra no HTML passa por `escaparHtml`.
- Dependências: só `express`. Os testes usam `node:test` + `node:assert/strict`, sem bibliotecas extras.
- Todo o texto visível fica em português do Brasil. Os nomes no código também ficam em português, para facilitar a leitura do estudante.
- Os commits terminam com a linha `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Didática (spec §12):** cada tarefa começa explicando o que vamos fazer e por quê. Os conceitos listados em "Explicar" são apresentados na primeira vez que aparecem, e a tarefa termina com a "Pergunta ao estudante". A resposta não bloqueia o próximo passo.

## Foco de revisão

1. **Filme com campos vazios** (sem pôster, sem data, duração 0, sem sinopse, sem gêneros): a tela mostra um substituto ("Sem pôster", "Sinopse não disponível") e nunca "null", "undefined" ou "NaN". Testes nas Tarefas 2, 4 e 6.
2. **Filme sem nenhum provedor no Brasil:** a página diz "Não disponível em nenhum streaming no Brasil no momento." Testes nas Tarefas 2 e 6.
3. **Texto do TMDB com HTML ou aspas** (título, resenha, nome do autor): o texto aparece como texto e não vira HTML. Testes nas Tarefas 4 e 6.
4. **TMDB fora do ar, token inválido ou id inexistente:** o servidor não cai; a API responde 502 ou 404 com `{ erro }`, e a página mostra a mensagem. Testes nas Tarefas 1 e 3.
5. **Busca vazia, só com espaços ou com acentos** ("Cidade de Deus", "Ação"): a busca vazia devolve uma lista vazia sem chamar o TMDB, e os acentos chegam corretos. Testes nas Tarefas 1 e 3.

## Estrutura de arquivos

```
package.json            scripts: start, dev, test; "type": "module"
.gitignore              node_modules/, .env
.env.example            TMDB_TOKEN=coloque-seu-token-aqui
README.md               como rodar (Tarefa 7)
scripts/testar-conexao.js   checagem manual do token
server/
  constantes.js         REGIAO, IDIOMA, MIN_VOTOS, MAX_PAGINA, PROVEDORES_PRINCIPAIS
  tmdb.js               cliente do TMDB (monta URLs, envia token, trata erros)
  simplificar.js        funções puras: JSON do TMDB → formato do site
  app.js                criarApp({ tmdb }): rotas /api e arquivos estáticos
  index.js              ponto de entrada: lê .env, cria cliente, escuta na porta 3000
public/
  index.html  busca.html  filme.html
  css/estilo.css
  img/tmdb-logo.svg
  js/api.js             funções que chamam /api
  js/formatar.js        funções puras de formatação
  js/componentes.js     funções puras que devolvem trechos de HTML (string)
  js/inicio.js  js/busca.js  js/filme.js   scripts de cada página (DOM)
test/
  ajudantes.js          criarFetchFalso, iniciarServidor
  tmdb.test.js  simplificar.test.js  app.test.js  formatar.test.js  componentes.test.js
```

Os scripts de página (`inicio.js`, `busca.js`, `filme.js`) não têm teste automático: eles só ligam o DOM às funções já testadas. Por isso, a verificação deles é manual, com a lista de conferência de cada tarefa. Assim, o projeto não precisa de ferramentas de teste de navegador, o que o manteria simples para o estudante.

---

### Task 1 (Tarefa 1): Projeto, conta no TMDB e cliente do TMDB

**Arquivos:**
- Criar: `package.json`, `.gitignore`, `.env.example`, `.env`, `server/constantes.js`, `server/tmdb.js`, `scripts/testar-conexao.js`, `test/ajudantes.js`
- Teste: `test/tmdb.test.js`

**Interfaces:**
- Produz:
  - `server/constantes.js`: `REGIAO = 'BR'`, `IDIOMA = 'pt-BR'`, `MIN_VOTOS = 300`, `MAX_PAGINA = 500`, `PROVEDORES_PRINCIPAIS = [8, 119, 1899, 337, 307, 350, 531]` (os IDs são conferidos na Tarefa 3).
  - `server/tmdb.js`: `class ErroTmdb extends Error { status: number }`, `criarClienteTmdb({ token, fetchFn = fetch })`, que devolve:
    - `descobrir({ ordem: 'nota'|'populares', provedores: number[], pagina: number })` → JSON bruto do `/discover/movie`
    - `buscar({ texto: string, pagina: number })` → JSON bruto do `/search/movie`
    - `detalhes(id: number)` → JSON bruto do `/movie/{id}` com `append_to_response=watch/providers`
    - `resenhas(id: number, idioma: 'pt-BR'|'en-US')` → JSON bruto do `/movie/{id}/reviews`
    - `provedores()` → JSON bruto do `/watch/providers/movie`
    - `limitarPagina(valor)` exportada à parte: um número inteiro de 1 a 500; valores inválidos viram 1.
  - `test/ajudantes.js`: `criarFetchFalso(resposta = {}, status = 200)` → `{ fn, chamadas }`, em que cada chamada é `{ url: URL, opcoes }`.

**Explicar:** terminal; o que é Node.js e npm; `package.json`; git (repositório, commit, `.gitignore`) e por que o `.env` fica de fora; o que é uma API, requisição HTTP e JSON; token como "senha do app"; `async/await`; o que é um teste automático e por que usamos um `fetch` falso nos testes.
**Pergunta ao estudante:** "Se o `.env` fosse para o GitHub por engano, o que alguém poderia fazer com o seu token?"

- [ ] **Passo 1: Criar a conta no TMDB com o estudante.** Guiar o cadastro em themoviedb.org → Configurações → API → pedir a chave (uso pessoal ou educacional) → copiar o **"API Read Access Token"**. O estudante guarda o token. Ele ainda não vai para nenhum arquivo.
- [ ] **Passo 2: Iniciar o projeto.** `git init`. Conferir `git config user.name` e `git config user.email`; se estiverem vazios, pedir ao estudante os dados dele e configurar só para este repositório. `npm init -y` e depois `npm install express@5`. No `package.json`: `"type": "module"` e os scripts `"start": "node --env-file=.env server/index.js"`, `"dev": "node --env-file=.env --watch server/index.js"` e `"test": "node --test"`. Criar o `.gitignore` (`node_modules/`, `.env`), o `.env.example` e o `.env` com `TMDB_TOKEN=<token do estudante>`.
- [ ] **Passo 3: Escrever os testes que falham** em `test/tmdb.test.js`, com `criarFetchFalso` e `criarClienteTmdb({ token: 'TOKEN-TESTE', fetchFn })`:

```js
test('envia o token e usa a URL base', ...)          // chamadas[0].url.origin + pathname === 'https://api.themoviedb.org/3/watch/providers/movie'
                                                      // opcoes.headers.Authorization === 'Bearer TOKEN-TESTE'
                                                      // searchParams: watch_region=BR, language=pt-BR
test('descobrir por nota: assinatura, BR, mínimo 300 votos', ...)
  // descobrir({ ordem:'nota', provedores:[], pagina:1 }) → sort_by=vote_average.desc, vote_count.gte=300,
  // with_watch_monetization_types=flatrate, watch_region=BR, page=1, e SEM with_watch_providers
test('descobrir populares não exige mínimo de votos', ...)   // sort_by=popularity.desc; vote_count.gte ausente
test('vários provedores viram OU', ...)              // provedores:[8,119] → with_watch_providers === '8|119'
test('buscar mantém acentos e espaços', ...)         // buscar({ texto:'Ação Cidade de Deus', pagina:1 }) → pathname termina em /search/movie,
                                                      // searchParams.get('query') === 'Ação Cidade de Deus'
test('detalhes pede watch/providers junto', ...)     // detalhes(550) → pathname termina em /movie/550, append_to_response === 'watch/providers'
test('resenhas usa o idioma pedido', ...)            // resenhas(550,'en-US') → /movie/550/reviews, language === 'en-US'
test('limitarPagina', ...)                           // 999→500, 0→1, 'abc'→1, '3'→3, 2.7→2
test('resposta de erro vira ErroTmdb com status', ...)  // criarFetchFalso({}, 404) → rejects ErroTmdb com status 404
test('falha de rede vira ErroTmdb com status 0', ...)   // fetchFn que lança TypeError → rejects ErroTmdb com status 0
```

- [ ] **Passo 4: Rodar e ver falhar.** `npm test` → FALHA (o módulo `server/tmdb.js` não existe).
- [ ] **Passo 5: Implementar `server/constantes.js` e `server/tmdb.js`.** Um `get(caminho, params)` interno monta a `URL` com `searchParams` (isso cuida dos acentos), envia `Authorization: Bearer <token>`, devolve `await resposta.json()` e lança `ErroTmdb` quando `!resposta.ok` ou quando o `fetch` lança um erro.
- [ ] **Passo 6: Rodar e ver passar.** `npm test` → todos PASSAM.
- [ ] **Passo 7: Conferir com o TMDB de verdade.** `scripts/testar-conexao.js` cria o cliente com `process.env.TMDB_TOKEN` e imprime `detalhes(550).title`. Rodar `node --env-file=.env scripts/testar-conexao.js` → esperado: `Clube da Luta`.
- [ ] **Passo 8: Commit** (incluindo o spec e este plano): `git add .` → conferir com `git status` que o `.env` NÃO aparece → `git commit -m "feat: projeto inicial e cliente do TMDB"`.

---

### Task 2 (Tarefa 2): Simplificar o JSON do TMDB

**Arquivos:**
- Criar: `server/simplificar.js`
- Teste: `test/simplificar.test.js`

**Interfaces:**
- Produz (funções puras):
  - `simplificarResumo(raw)` → `FilmeResumo = { id, titulo, ano: number|null, poster: string|null, nota: number|null, votos: number }`. A nota é arredondada para 1 casa decimal; se `vote_count` for 0, a nota é `null`.
  - `simplificarProvedor(raw)` → `Provedor = { id, nome, logo: string|null }`
  - `simplificarOndeAssistir(rawRegiao | undefined)` → `OndeAssistir = { disponivel: boolean, link: string|null, assinatura: Provedor[], gratis: Provedor[], anuncios: Provedor[], aluguel: Provedor[], compra: Provedor[] }`. Mapeamento: `flatrate→assinatura`, `free→gratis`, `ads→anuncios`, `rent→aluguel`, `buy→compra`. `disponivel` é verdadeiro quando algum grupo tem itens.
  - `simplificarResenha(raw, idioma)` → `Resenha = { id, autor, texto, idioma, nota: number|null, data: string }`
  - `juntarResenhas(pt: Resenha[], en: Resenha[])` → primeiro as em pt-BR, depois as em en-US, sem repetir `id`.
  - `simplificarDetalhe(raw, resenhas: Resenha[])` → `FilmeDetalhe = { ...FilmeResumo, duracaoMin: number|null, generos: string[], sinopse: string|null, ondeAssistir: OndeAssistir, resenhas: Resenha[] }`. Usa `raw['watch/providers'].results.BR`.
  - `ordenarProvedores(provedores: Provedor[], principais: number[])` → primeiro os principais na ordem de `principais`, depois os demais em ordem alfabética (`localeCompare(…, 'pt-BR')`).

**Explicar:** o que é uma função pura e por que ela é fácil de testar; por que o servidor "enxuga" o JSON antes de mandar ao navegador; `null` versus string vazia.
**Pergunta ao estudante:** "Por que não mostrar a nota de um filme que tem 0 votos?"

- [ ] **Passo 1: Escrever os testes que falham:**

```js
test('resumo completo', ...)   // {id:550,title:'Clube da Luta',release_date:'1999-10-15',poster_path:'/a.jpg',vote_average:8.438,vote_count:30000}
                               // → {id:550,titulo:'Clube da Luta',ano:1999,poster:'/a.jpg',nota:8.4,votos:30000}
test('resumo sem data, sem pôster e sem votos', ...)  // release_date:'', poster_path:null, vote_average:0, vote_count:0 → ano:null, poster:null, nota:null
test('onde assistir agrupa por tipo', ...)  // {link:'L', flatrate:[{provider_id:8,provider_name:'Netflix',logo_path:'/n.jpg'}], rent:[{provider_id:2,provider_name:'Apple TV',logo_path:'/a.jpg'}]}
                                            // → disponivel:true, link:'L', assinatura:[{id:8,nome:'Netflix',logo:'/n.jpg'}], aluguel:[{id:2,...}], gratis/anuncios/compra: []
test('onde assistir sem dados do Brasil', ...)  // undefined → {disponivel:false, link:null, todos os grupos []}
test('detalhe com campos vazios', ...)  // runtime:0, overview:'', genres:[], 'watch/providers':{results:{US:{...}}}
                                        // → duracaoMin:null, sinopse:null, generos:[], ondeAssistir.disponivel:false
test('detalhe completo', ...)  // runtime:139, genres:[{id:18,name:'Drama'}] → duracaoMin:139, generos:['Drama'], resenhas repassadas
test('resenha', ...)  // {id:'r1',author:'Ana',content:'Ótimo',created_at:'2020-01-01T00:00:00Z',author_details:{rating:null}}, 'pt-BR'
                      // → {id:'r1',autor:'Ana',texto:'Ótimo',idioma:'pt-BR',nota:null,data:'2020-01-01T00:00:00Z'}
test('juntarResenhas sem repetir', ...)  // pt:[r1], en:[r1(en), r2] → ids ['r1','r2'], r1 com idioma 'pt-BR'
test('ordenarProvedores', ...)  // [{id:5,nome:'Zeta'},{id:119,…},{id:3,nome:'Alfa'},{id:8,…}], [8,119] → ids [8,119,3,5]
```

- [ ] **Passo 2: Rodar e ver falhar.** `npm test` → FALHA (o módulo não existe).
- [ ] **Passo 3: Implementar `server/simplificar.js`** com as assinaturas acima.
- [ ] **Passo 4: Rodar e ver passar.** `npm test` → todos PASSAM.
- [ ] **Passo 5: Commit.** `git commit -m "feat: simplifica respostas do TMDB"`

---

### Task 3 (Tarefa 3): Servidor Express com as rotas `/api`

**Arquivos:**
- Criar: `server/app.js`, `server/index.js`
- Modificar: `test/ajudantes.js` (adicionar `iniciarServidor`), e talvez `server/constantes.js` (os IDs conferidos no Passo 6)
- Teste: `test/app.test.js`

**Interfaces:**
- Consome: o cliente da Tarefa 1 (`descobrir`, `buscar`, `detalhes`, `resenhas`, `provedores`, `ErroTmdb`, `limitarPagina`) e as funções da Tarefa 2.
- Produz:
  - `criarApp({ tmdb })` → app Express, que também serve `public/` como arquivos estáticos.
  - `iniciarServidor(app)` → `{ url: string, fechar(): Promise }`, que escuta na porta 0.
  - Rotas (sempre JSON):
    - `GET /api/provedores` → `Provedor[]` ordenados com `PROVEDORES_PRINCIPAIS`.
    - `GET /api/descobrir?ordem=nota|populares&provedores=8,119&pagina=1` → `ListaFilmes = { pagina, totalPaginas, filmes: FilmeResumo[] }`, com `totalPaginas = min(total_pages, 500)`. Uma `ordem` desconhecida vira `'nota'`.
    - `GET /api/buscar?q=texto&pagina=1` → `ListaFilmes`.
    - `GET /api/filme/:id` → `FilmeDetalhe`, com as resenhas em pt-BR e en-US buscadas em paralelo (`Promise.all`) e combinadas com `juntarResenhas`.
    - Erros: `{ erro: string }`. Um id que não é inteiro positivo, ou um `ErroTmdb` com status 404 → 404 `{ erro: 'Filme não encontrado.' }`. Qualquer outro erro → 502 `{ erro: 'Não foi possível falar com o TMDB agora. Tente de novo em instantes.' }`.
  - `server/index.js`: encerra com a mensagem `Falta o TMDB_TOKEN no arquivo .env` quando a variável não existe; caso contrário, escuta na porta `process.env.PORT || 3000` e imprime `Site rodando em http://localhost:3000`.

**Explicar:** o que é um servidor e uma porta; rota; `req.query`, `req.params`; código de status HTTP (200, 404, 502); por que o navegador chama o nosso servidor e não o TMDB (o "balconista"); `Promise.all`.
**Pergunta ao estudante:** "Por que respondemos 502, e não 500, quando é o TMDB que falha?"

- [ ] **Passo 1: Escrever os testes que falham.** Usam um `tmdb` falso (um objeto com as cinco funções devolvendo JSON bruto fixo e registrando os argumentos), `criarApp` e `iniciarServidor`:

```js
test('descobrir repassa filtros e simplifica', ...)  // /api/descobrir?ordem=populares&provedores=8,119&pagina=2
                                                      // → tmdb.descobrir recebeu {ordem:'populares', provedores:[8,119], pagina:2}
                                                      // → 200, corpo.pagina===2, corpo.filmes[0].titulo definido, totalPaginas ≤ 500
test('ordem desconhecida vira nota', ...)            // ?ordem=xyz → tmdb.descobrir recebeu ordem 'nota'
test('busca vazia não chama o TMDB', ...)            // /api/buscar?q=%20%20 → 200 {pagina:1,totalPaginas:0,filmes:[]}, tmdb.buscar não chamado
test('busca envia o texto sem espaços nas pontas', ...)  // ?q=%20A%C3%A7%C3%A3o%20 → tmdb.buscar recebeu texto 'Ação'
test('filme junta detalhes e resenhas', ...)         // /api/filme/550 → 200; tmdb.resenhas chamado com (550,'pt-BR') e (550,'en-US')
test('id inválido é 404 sem chamar o TMDB', ...)     // /api/filme/abc → 404 {erro:'Filme não encontrado.'}
test('TMDB 404 vira 404', ...)                       // detalhes lança new ErroTmdb(404) → 404 {erro:'Filme não encontrado.'}
test('TMDB fora do ar vira 502', ...)                // descobrir lança new ErroTmdb(0) → 502 {erro:'Não foi possível falar com o TMDB agora. Tente de novo em instantes.'}
test('provedores ordenados', ...)                    // /api/provedores → o primeiro id é 8 quando a lista falsa contém 8
```

- [ ] **Passo 2: Rodar e ver falhar.** `npm test` → FALHA.
- [ ] **Passo 3: Implementar `server/app.js`, `iniciarServidor` e `server/index.js`.** Usar um tratador de erros do Express (`(err, req, res, next)`) para mapear erros em 404/502 num só lugar.
- [ ] **Passo 4: Rodar e ver passar.** `npm test` → todos PASSAM.
- [ ] **Passo 5: Ver no navegador.** `npm run dev` e abrir `http://localhost:3000/api/filme/550` → um JSON com `"titulo":"Clube da Luta"` e `ondeAssistir`. Mostrar ao estudante a diferença para o JSON bruto do TMDB.
- [ ] **Passo 6: Conferir os IDs dos provedores principais.** Abrir `/api/provedores` e confirmar que os IDs de `PROVEDORES_PRINCIPAIS` correspondem a Netflix, Prime Video, Max, Disney+, Globoplay, Apple TV+ e Paramount+ no Brasil. Corrigir em `server/constantes.js` o que estiver diferente.
- [ ] **Passo 7: Commit.** `git commit -m "feat: servidor com rotas /api"`

---

### Task 4 (Tarefa 4): Funções de exibição no navegador

**Arquivos:**
- Criar: `public/js/formatar.js`, `public/js/componentes.js`
- Teste: `test/formatar.test.js`, `test/componentes.test.js`

**Interfaces:**
- Produz (módulos ES puros, sem DOM, que também podem ser importados pelos testes no Node):
  - `formatar.js`:
    - `escaparHtml(texto)` → string; trata `& < > " '`; `null` ou `undefined` viram `''`.
    - `urlImagem(caminho, tamanho = 'w342')` → `'https://image.tmdb.org/t/p/' + tamanho + caminho`, ou `null`.
    - `formatarNota(nota)` → `'8,4'`, ou `'–'` quando `null`.
    - `formatarDuracao(min)` → `'2h 19min'` / `'45min'` / `''`.
    - `cortarTexto(texto, limite)` → `{ curto, cortado }`.
  - `componentes.js`:
    - `cartaoFilme(filme: FilmeResumo)` → HTML de um `<a class="cartao" href="filme.html?id=ID">` com pôster (ou um `<div class="sem-poster">Sem pôster</div>`), título, ano (omitido se `null`) e nota.
    - `listaVazia(mensagem)` → `<p class="vazio">…</p>` com a mensagem escapada.

**Explicar:** módulos (`import`/`export`); template strings; XSS: por que escapar texto de terceiros antes de colocá-lo no `innerHTML`.
**Pergunta ao estudante:** "Se uma resenha tivesse o texto `<img src=x onerror=alert(1)>` e a gente não escapasse, o que aconteceria?"

- [ ] **Passo 1: Escrever os testes que falham:**

```js
test('escaparHtml', ...)       // `<script>"&'` → '&lt;script&gt;&quot;&amp;&#39;'; null → ''
test('urlImagem', ...)         // ('/a.jpg') → 'https://image.tmdb.org/t/p/w342/a.jpg'; ('/a.jpg','w92') usa w92; (null) → null
test('formatarNota', ...)      // 8.4 → '8,4'; 7 → '7,0'; null → '–'
test('formatarDuracao', ...)   // 139 → '2h 19min'; 45 → '45min'; 120 → '2h'; null → ''
test('cortarTexto', ...)       // ('abc def', 3) → {curto:'abc…', cortado:true}; ('abc', 10) → {curto:'abc', cortado:false}
test('cartaoFilme completo', ...)   // {id:550,titulo:'Clube da Luta',ano:1999,poster:'/a.jpg',nota:8.4,votos:1}
                                    // contém 'filme.html?id=550', 'Clube da Luta', '1999', '8,4', 'w342/a.jpg'
test('cartaoFilme com campos vazios e HTML no título', ...)  // {id:1,titulo:'<b>X</b>',ano:null,poster:null,nota:null,votos:0}
                                    // contém '&lt;b&gt;X' e 'sem-poster'; não contém '<b>', 'null', 'undefined'
test('listaVazia escapa', ...)      // listaVazia('<i>') contém '&lt;i&gt;'
```

- [ ] **Passo 2: Rodar e ver falhar.** `npm test` → FALHA.
- [ ] **Passo 3: Implementar `public/js/formatar.js` e `public/js/componentes.js`.**
- [ ] **Passo 4: Rodar e ver passar.** `npm test` → todos PASSAM.
- [ ] **Passo 5: Commit.** `git commit -m "feat: funções de exibição"`

---

### Task 5 (Tarefa 5): Página inicial, visual e rodapé

**Arquivos:**
- Criar: `public/index.html`, `public/css/estilo.css`, `public/img/tmdb-logo.svg`, `public/js/api.js`, `public/js/inicio.js`

**Interfaces:**
- Consome: as rotas da Tarefa 3 e `cartaoFilme`/`listaVazia` da Tarefa 4.
- Produz:
  - `api.js`: `pedirJson(url)` (lança `Error(corpo.erro)` quando a resposta não é ok), `carregarProvedores()`, `descobrir({ ordem, provedores, pagina })`, `buscar(texto, pagina)` e `carregarFilme(id)`.
  - Cabeçalho e rodapé padrão, que as Tarefas 6 e 7 copiam:
    - Cabeçalho: o nome do site com link para `index.html` e um `<form action="busca.html">` com `<input name="q" type="search" placeholder="Buscar filme…">`.
    - Rodapé: o logo do TMDB e o texto de atribuição das Restrições globais.

**Explicar:** a estrutura de um HTML; CSS mobile-first e `@media`; `<script type="module">`; o DOM, `querySelector`, `addEventListener` e `innerHTML`; o estado da página (filtros escolhidos, página atual).
**Pergunta ao estudante:** "Por que desenhar primeiro para a tela do celular e só depois para a do computador?"

- [ ] **Passo 1: Baixar o logo oficial do TMDB** (themoviedb.org/about/logos-attribution) para `public/img/tmdb-logo.svg`.
- [ ] **Passo 2: Criar o `index.html` e o `estilo.css`.** O `index.html` tem o cabeçalho, o título "O melhor no streaming agora", uma escolha de ordem ("Mais bem avaliados" / "Populares agora"), uma área de chips de provedores (seleção múltipla), uma grade de cartões, o botão "Carregar mais" e o rodapé. O visual tem cara de catálogo de cinema e é mobile-first: 2 colunas no celular e mais colunas em telas largas.
- [ ] **Passo 3: Implementar `api.js` e `inicio.js`.** Ao abrir a página, carrega os provedores e a primeira página. Trocar a ordem ou um chip recarrega a lista a partir da página 1. "Carregar mais" acrescenta a próxima página e some quando `pagina >= totalPaginas`. Um erro mostra `listaVazia(erro.message)`, e enquanto carrega aparece "Carregando…".
- [ ] **Passo 4: Conferir no navegador** com `npm run dev` em `http://localhost:3000`:
  - aparece uma lista de filmes bem avaliados;
  - marcar Netflix e depois Prime muda a lista;
  - "Populares agora" muda a ordem;
  - "Carregar mais" acrescenta filmes;
  - no DevTools, em modo celular (375px), não há rolagem horizontal;
  - o rodapé mostra o logo e o texto do TMDB;
  - na aba Network do DevTools, nenhuma requisição vai para `api.themoviedb.org`;
  - com `TMDB_TOKEN` errado no `.env`, a página mostra a mensagem de erro em vez de quebrar (depois, restaurar o token).
- [ ] **Passo 5: Rodar os testes.** `npm test` → todos PASSAM.
- [ ] **Passo 6: Commit.** `git commit -m "feat: página inicial"`

---

### Task 6 (Tarefa 6): Página do filme

**Arquivos:**
- Criar: `public/filme.html`, `public/js/filme.js`
- Modificar: `public/js/componentes.js`, `public/css/estilo.css`
- Teste: `test/componentes.test.js`

**Interfaces:**
- Consome: `carregarFilme(id)` (Tarefa 5), `formatar.js` (Tarefa 4) e o cabeçalho/rodapé (Tarefa 5).
- Produz, em `componentes.js`:
  - `secaoOndeAssistir(ondeAssistir: OndeAssistir)` → HTML. Grupos, nesta ordem, com estes títulos: `assinatura` "Incluso na assinatura", `gratis` "Grátis", `anuncios` "Grátis com anúncios", `aluguel` "Aluguel", `compra` "Compra". Os grupos vazios são omitidos. Cada provedor aparece com logo (`urlImagem(logo,'w92')`) e nome. Sempre termina com "Dados de streaming: JustWatch" e, quando houver `link`, com um link "Ver opções". Quando `disponivel` é falso: "Não disponível em nenhum streaming no Brasil no momento."
  - `cartaoResenha(resenha: Resenha)` → HTML com autor, data formatada em pt-BR, nota se houver, a etiqueta "Em inglês" quando `idioma === 'en-US'` e texto cortado em 600 caracteres com um botão "Ler mais" (`data-resenha-id`) quando `cortado`.

**Explicar:** ler parâmetros da URL (`URLSearchParams`, `location.search`); montar uma página a partir de um objeto; delegação de eventos (um só ouvinte para todos os botões "Ler mais").
**Pergunta ao estudante:** "Esta página recebe o id pela URL (`?id=550`). Que vantagem isso dá na hora de compartilhar um filme com um amigo?"

- [ ] **Passo 1: Escrever os testes que falham** em `test/componentes.test.js`:

```js
test('onde assistir indisponível', ...)   // {disponivel:false,...} → contém 'Não disponível em nenhum streaming no Brasil no momento.'
test('onde assistir com grupos', ...)     // assinatura:[Netflix], aluguel:[Apple TV], resto [] → contém 'Incluso na assinatura', 'Netflix', 'Aluguel';
                                          // não contém 'Compra'; contém 'Dados de streaming: JustWatch'
test('resenha em inglês e longa', ...)    // idioma 'en-US', texto de 700 caracteres → contém 'Em inglês' e 'Ler mais'
test('resenha escapa HTML', ...)          // autor '<img src=x onerror=alert(1)>' → contém '&lt;img'; não contém '<img src=x'
test('resenha sem nota', ...)             // nota:null → não contém 'null'
```

- [ ] **Passo 2: Rodar e ver falhar.** `npm test` → FALHA.
- [ ] **Passo 3: Implementar `secaoOndeAssistir` e `cartaoResenha`.**
- [ ] **Passo 4: Rodar e ver passar.** `npm test` → todos PASSAM.
- [ ] **Passo 5: Criar `filme.html` e `filme.js`.** A página lê `id` da URL; se ele não existir ou der erro, mostra a mensagem do servidor (por exemplo, "Filme não encontrado."). Mostra pôster, título, ano, duração, gêneros, nota com "(N votos)", sinopse ("Sinopse não disponível." quando `null`), onde assistir e resenhas ("Ainda não há resenhas para este filme." quando a lista está vazia). "Ler mais" mostra o texto completo. O `document.title` vira o título do filme.
- [ ] **Passo 6: Conferir no navegador:**
  - `filme.html?id=550` mostra todos os blocos;
  - clicar num cartão da página inicial abre o filme certo;
  - um filme que não está em nenhum streaming mostra a mensagem de indisponível;
  - `filme.html?id=999999999` e `filme.html` sem id mostram "Filme não encontrado.";
  - em 375px fica legível e sem rolagem horizontal.
- [ ] **Passo 7: Commit.** `git commit -m "feat: página do filme"`

---

### Task 7 (Tarefa 7): Busca e README

**Arquivos:**
- Criar: `public/busca.html`, `public/js/busca.js`, `README.md`

**Interfaces:**
- Consome: `buscar(texto, pagina)` (Tarefa 5), `cartaoFilme`/`listaVazia` (Tarefa 4) e o cabeçalho/rodapé (Tarefa 5).

**Explicar:** formulários com `method GET` e como a busca vai parar na URL; `encodeURIComponent`; para que serve um README.
**Pergunta ao estudante:** "Por que a busca mostra filmes que não estão em nenhum streaming?"

- [ ] **Passo 1: Criar `busca.html` e `busca.js`.**
  - O script lê `q` da URL, preenche o campo do cabeçalho e mostra "Resultados para "…"" (escapado), uma grade de cartões e "Carregar mais".
  - Se `q` estiver vazio: "Digite o nome de um filme para buscar."
  - Se não houver resultados: "Nenhum filme encontrado para "…"."
- [ ] **Passo 2: Conferir no navegador:**
  - buscar "Cidade de Deus" pelo cabeçalho de qualquer página leva aos resultados, e clicar abre o filme;
  - buscar "Ação" funciona, com o acento correto;
  - buscar só espaços mostra a mensagem de busca vazia;
  - buscar `<b>oi</b>` mostra o texto literal;
  - um termo sem sentido ("xqzxqz") mostra "Nenhum filme encontrado";
  - em 375px fica sem rolagem horizontal.
- [ ] **Passo 3: Escrever o `README.md`** (pt-BR): o que é o projeto, como obter o token do TMDB, como copiar o `.env.example` para `.env`, e os comandos `npm install`, `npm run dev` e `npm test`, com as atribuições ao TMDB e ao JustWatch.
- [ ] **Passo 4: Rodar a suíte final.** `npm test` → todos PASSAM.
- [ ] **Passo 5: Commit.** `git commit -m "feat: busca e README"`
- [ ] **Passo 6: Fechar a fase 1 com o estudante.** Recapitular o que foi construído e oferecer como próximo passo publicar o site num serviço gratuito que rode Node.js (exige conta no GitHub e no serviço). Isso fica como uma decisão dele, fora deste plano.
