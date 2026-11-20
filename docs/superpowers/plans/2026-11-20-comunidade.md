# Em Cartaz, fase 2 (comunidade): plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** pessoas com conta passam a avaliar filmes (nota de 1 a 10 e texto opcional) e a conversar numa Discussão com spoilers, fechada por padrão, com comentários e respostas. Tudo roda localmente, num banco SQLite de teste.

**Arquitetura:**
- O servidor Express da fase 1 ganha três peças: um banco SQLite (`node:sqlite`), um módulo de contas e sessões, e um módulo de comunidade (avaliações e comentários), cada um com rotas `/api` próprias.
- O login usa um cookie `sessao` com `HttpOnly` e `SameSite=Lax`. O banco guarda só o hash SHA-256 do token.
- O navegador continua em HTML, CSS e JavaScript puro. As funções que montam HTML ficam em módulos puros, testados no Node.

**Tecnologias:** Node.js 26 (`node:sqlite` com `DatabaseSync`, `node:crypto` com `scrypt`, `randomBytes`, `timingSafeEqual` e `createHash`), Express 5 e `node:test`.

**Spec:** [docs/superpowers/specs/2026-11-19-comunidade-design.md](../specs/2026-11-19-comunidade-design.md). A spec da fase 1 também continua valendo.

## Restrições globais

**Dependências e banco**
- Nenhuma dependência nova no `package.json`.
- Todo SQL usa parâmetros `?` em `db.prepare(...)`. **Nunca** se monta SQL juntando texto, para evitar injeção de SQL.
- O banco de verdade fica em `dados/em-cartaz.db`, e `dados/` entra no `.gitignore`. Os testes usam `abrirBanco(':memory:')`, um banco novo por teste.
- As datas ficam no banco em milissegundos (`agora()`). A API devolve datas em texto ISO (`new Date(ms).toISOString()`).

**Segurança**
- A API nunca devolve `email`, `hash_senha` ou o token, com uma exceção: `GET /api/conta/eu` devolve o e-mail da própria pessoa.
- O cookie `sessao` tem `HttpOnly`, `SameSite=Lax`, `Path=/` e `Max-Age=2592000`, que são 30 dias.
- Todo `POST`, `PUT` e `DELETE` em `/api` exige `Content-Type: application/json`. Sem isso, a resposta é 400 com `{ erro: 'Envie os dados em JSON.' }`.

**Erros da API**
- Os erros novos são `ErroPedido(status, mensagem)` e viram `res.status(status).json({ erro: mensagem })`.
- Um JSON malformado no corpo responde 400 com `{ erro: 'Dados inválidos.' }`.

**Mensagens (o texto é exatamente este)**

| Situação | Status | Mensagem |
|---|---|---|
| E-mail inválido | 400 | "Informe um e-mail válido." |
| Senha curta | 400 | "A senha precisa ter pelo menos 8 caracteres." |
| Senha longa | 400 | "A senha pode ter no máximo 200 caracteres." |
| Nome fora do tamanho | 400 | "O nome precisa ter de 2 a 30 caracteres." |
| E-mail repetido | 400 | "Este e-mail já tem conta. Tente entrar." |
| Nome repetido | 400 | "Este nome já está em uso. Escolha outro." |
| Login falhou | 400 | "E-mail ou senha incorretos." |
| Sem login | 401 | "Entre na sua conta para continuar." |
| Conteúdo de outra pessoa | 403 | "Você só pode apagar o que você escreveu." |
| Nota inválida | 400 | "A nota precisa ser um número inteiro de 1 a 10." |
| Texto de avaliação longo | 400 | "O texto pode ter no máximo 5.000 caracteres." |
| Comentário vazio | 400 | "Escreva algo antes de enviar." |
| Comentário longo | 400 | "O comentário pode ter no máximo 2.000 caracteres." |
| Comentário não encontrado | 404 | "Comentário não encontrado." |
| Sem avaliação para apagar | 404 | "Você ainda não avaliou este filme." |

**Interface e estilo**
- Os textos da interface estão na spec (§4 e §10) e nas tarefas abaixo. Todo texto de usuário entra no HTML por `escaparHtml` ou `textContent`.
- O código fica em português, e os commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Didática:** cada tarefa começa explicando o que vamos fazer e por quê, apresenta os conceitos de "Explicar" e termina com a "Pergunta ao estudante". A resposta não bloqueia o próximo passo.

## Foco de revisão

1. **Spoiler vazando:** nenhuma rota além de `GET /api/filme/:id/comentarios` devolve comentários, e a página só faz esse pedido depois do clique. O teste fica na Tarefa 4.
2. **Mexer no que é de outra pessoa:** apagar o comentário de outro usuário responde 403. A avaliação é sempre a do usuário da sessão, nunca a de um id enviado pelo navegador. Os testes ficam nas Tarefas 3 e 4.
3. **Token forjado, expirado ou depois de "Sair":** o pedido é tratado como sem login (401 em escrita). O teste fica na Tarefa 2.
4. **HTML em nome, avaliação ou comentário:** aparece como texto. Os testes ficam nas Tarefas 5 e 6.
5. **`volta` malicioso** (`https://mal.com`, `//mal.com`, `javascript:alert(1)`): vira `index.html`. O teste fica na Tarefa 5.

## Estrutura de arquivos (novos e alterados)

```
server/
  banco.js        abrirBanco(caminho): abre o SQLite e cria as tabelas
  senhas.js       gerarHashSenha, conferirSenha
  erros.js        ErroPedido(status, mensagem)
  cookies.js      lerCookies(cabecalho), cookieSessao(token), cookieApagado()
  contas.js       criarContas(db, { agora }): cadastro, login, sessões
  comunidade.js   criarComunidade(db, { agora }): avaliações e comentários
  app.js          (alterado) criarApp({ tmdb, db, agora }) com as rotas novas
  index.js        (alterado) abre dados/em-cartaz.db
public/
  entrar.html  cadastrar.html
  js/conta.js         formulários de entrar e cadastrar (DOM)
  js/cabecalho.js     área da conta no cabeçalho de todas as páginas (DOM)
  js/navegacao.js     destinoSeguro(volta), linkEntrar(destino): funções puras
  js/comunidade.js    avaliações e discussão na página do filme (DOM)
  js/componentes.js   (alterado) componentes novos, puros
  js/api.js           (alterado) enviarJson e as funções novas
  js/filme.js         (alterado) nota da comunidade e as novas seções
  index.html busca.html filme.html   (alterados) <div id="conta"> no cabeçalho
test/
  ajudantes.js        (alterado) criarNavegador(url): pedidos com cookie
  banco.test.js  senhas.test.js  cookies.test.js  contas.test.js
  conta-rotas.test.js  avaliacoes.test.js  comentarios.test.js  navegacao.test.js
```

---

### Task 1 (Tarefa 1): Banco de dados e senhas

**Arquivos:**
- Criar: `server/banco.js`, `server/senhas.js`.
- Alterar: `.gitignore`, acrescentando `dados/`.
- Teste: `test/banco.test.js`, `test/senhas.test.js`.

**Interfaces:**
- **Produz `abrirBanco(caminho = ':memory:')`**, que devolve um `DatabaseSync`.
  - Liga `PRAGMA foreign_keys = ON`.
  - Cria as tabelas com `CREATE TABLE IF NOT EXISTS`:
    - `usuarios(id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, nome TEXT NOT NULL UNIQUE COLLATE NOCASE, hash_senha TEXT NOT NULL, criado_em INTEGER NOT NULL)`
    - `sessoes(hash_token TEXT PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, expira_em INTEGER NOT NULL)`
    - `avaliacoes(id INTEGER PRIMARY KEY, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, filme_id INTEGER NOT NULL, nota INTEGER NOT NULL CHECK(nota BETWEEN 1 AND 10), texto TEXT NOT NULL DEFAULT '', criado_em INTEGER NOT NULL, atualizado_em INTEGER NOT NULL, UNIQUE(usuario_id, filme_id))`
    - `comentarios(id INTEGER PRIMARY KEY, filme_id INTEGER NOT NULL, usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE, resposta_a INTEGER REFERENCES comentarios(id) ON DELETE CASCADE, texto TEXT NOT NULL, apagado INTEGER NOT NULL DEFAULT 0, criado_em INTEGER NOT NULL)`
  - Cria também um índice em `comentarios(filme_id)` e outro em `avaliacoes(filme_id)`.
- **Produz `gerarHashSenha(senha)`**, que devolve `'scrypt$<sal hex 16 bytes>$<hash hex 64 bytes>'` (usa `scryptSync`).
- **Produz `conferirSenha(senha, guardado)`**, que devolve um booleano.
  - Compara com `timingSafeEqual`.
  - Um texto `guardado` malformado devolve `false`, sem lançar erro.

**Explicar:**
- Banco de dados, tabela, linha e coluna.
- SQL (`CREATE`, `INSERT`, `SELECT`), chave primária, `UNIQUE` e `REFERENCES`.
- Por que usar `?` em vez de juntar texto (injeção de SQL).
- Hash versus criptografia, o "sal" e por que a comparação em tempo constante importa.

**Pergunta ao estudante:** "Se dois usuários usam a mesma senha '12345678', por que o hash guardado dos dois é diferente?"

- [ ] **Passo 1: Escrever os testes que falham:**

```js
// banco.test.js
test('cria as quatro tabelas', ...)                 // sqlite_master tem usuarios, sessoes, avaliacoes, comentarios
test('abrir duas vezes o mesmo banco não dá erro', ...)  // banco em arquivo temporário (os.tmpdir), abrir 2x
test('e-mail repetido é recusado, sem diferenciar maiúsculas', ...)  // insert 'ana@x.com' e depois 'ANA@x.com' → lança
test('uma avaliação por usuário por filme', ...)     // 2º insert (usuario 1, filme 550) → lança
test('nota fora de 1..10 é recusada pelo banco', ...) // nota 11 → lança
// senhas.test.js
test('hash não contém a senha e começa com scrypt$', ...)
test('mesma senha gera hashes diferentes (sal)', ...)
test('conferirSenha: certa → true, errada → false', ...)
test('conferirSenha com texto guardado malformado → false', ...)  // 'lixo', '', 'scrypt$zz$zz'
```

- [ ] **Passo 2: Rodar e ver falhar.** `npm test` → FALHA (os módulos não existem).
- [ ] **Passo 3: Implementar `server/banco.js` e `server/senhas.js`** e acrescentar `dados/` ao `.gitignore`.
- [ ] **Passo 4: Rodar e ver passar.** `npm test` → todos PASSAM.
- [ ] **Passo 5: Commit.** `git commit -m "feat: banco de dados SQLite e hash de senhas"`

---

### Task 2 (Tarefa 2): Contas, sessões e cookie

**Arquivos:**
- Criar: `server/erros.js`, `server/cookies.js`, `server/contas.js`.
- Alterar: `server/app.js`, `server/index.js`, `test/ajudantes.js`.
- Teste: `test/cookies.test.js`, `test/contas.test.js`, `test/conta-rotas.test.js`.

**Interfaces:**
- **Consome:** `abrirBanco`, `gerarHashSenha` e `conferirSenha` (Tarefa 1).
- **Produz `server/erros.js`:** `class ErroPedido extends Error { status }`.
- **Produz `server/cookies.js`:**
  - `lerCookies(cabecalho)` recebe `'a=1; sessao=x'` e devolve `{ a: '1', sessao: 'x' }`. Valores com `%` passam por `decodeURIComponent` com `try`.
  - `cookieSessao(token)` devolve `'sessao=<token>; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000'`.
  - `cookieApagado()` devolve `'sessao=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'`.
- **Produz `criarContas(db, { agora = Date.now })`**, que devolve um objeto com quatro funções:
  - `cadastrar({ email, senha, nome })` devolve `Usuario = { id, nome, email }`.
    - O e-mail passa por `trim` e vira minúsculas, e o nome passa por `trim`.
    - O e-mail é validado com `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
    - As validações seguem a ordem e as mensagens das Restrições globais. Lança `ErroPedido(400, …)`.
  - `entrar({ email, senha })` devolve `{ token, usuario }`.
    - O token é `randomBytes(32).toString('base64url')`.
    - Grava `sha256(token)` em hexadecimal, com `expira_em = agora() + 30 dias`.
    - E-mail inexistente ou senha errada dão o mesmo `ErroPedido(400, 'E-mail ou senha incorretos.')`.
  - `usuarioDaSessao(token)` devolve `Usuario`, ou `null` se o token for vazio, desconhecido ou expirado.
  - `sair(token)` apaga a sessão.
- **Produz `criarApp({ tmdb, db = abrirBanco(), agora = Date.now })`.**
  - Um middleware em `/api` lê o cookie e preenche `req.usuario`, que é um `Usuario` ou `null`.
  - Ele também exige JSON nos métodos de escrita.
  - `express.json({ limit: '20kb' })`.
  - As rotas:
    - `POST /api/conta/cadastrar` responde 201 com `{ usuario: { id, nome } }` e já entra na conta, enviando o `Set-Cookie`.
    - `POST /api/conta/entrar` responde 200 com `{ usuario: { id, nome } }` e o `Set-Cookie`.
    - `POST /api/conta/sair` responde 204 e envia o `cookieApagado()`.
    - `GET /api/conta/eu` responde `{ usuario: { id, nome, email } | null }`.
  - O tratador de erros ganha dois casos, que entram antes dos que já existem:
    - um `ErroPedido` vira `status` e `{ erro }`;
    - `erro.type === 'entity.parse.failed'` vira 400 com `'Dados inválidos.'`.
- **Produz um ajudante de teste:** `criarNavegador(url)` devolve `{ pedir(caminho, { metodo = 'GET', corpo, tipo = 'application/json' } = {}) }`.
  - `pedir` devolve `{ status, corpo, cabecalhos }`.
  - O ajudante guarda o cookie `sessao` recebido no `set-cookie` e o envia nos próximos pedidos, como um navegador faz.
- **Altera `index.js`:** faz `mkdirSync('dados', { recursive: true })` e usa `abrirBanco('dados/em-cartaz.db')`.

**Explicar:**
- Cookie e cada atributo (`HttpOnly`, `SameSite`, `Max-Age`) e o que é uma sessão.
- Por que o banco guarda o hash do token.
- Os status 201, 204, 400 e 401.
- Middleware e `req.usuario`.
- Por que o login errado tem uma só mensagem.
- CSRF, explicado em linguagem simples.

**Pergunta ao estudante:** "Se alguém roubar o arquivo `em-cartaz.db`, por que ainda assim não consegue entrar na sua conta?"

- [ ] **Passo 1: Escrever os testes que falham:**

```js
// cookies.test.js
test('lerCookies', ...)                 // '' → {}; 'a=1; sessao=x%20y' → {a:'1', sessao:'x y'}; '%E0' malformado não lança
test('cookieSessao tem HttpOnly, SameSite=Lax, Path=/ e 30 dias', ...)
// contas.test.js (banco em memória, agora falso)
test('cadastrar normaliza e-mail e nome', ...)          // ' Ana@X.com ' → 'ana@x.com'; ' Ana ' → 'Ana'
test('cadastrar valida e-mail, senha e nome', ...)      // cada mensagem exata das Restrições globais
test('e-mail ou nome repetido é recusado', ...)         // 'ANA@x.com' e 'ana' (nome) → mensagens exatas
test('entrar certo devolve token e usuário', ...)
test('entrar errado: mesma mensagem para e-mail inexistente e senha errada', ...)
test('banco guarda o hash do token, não o token', ...)  // SELECT hash_token ≠ token; = sha256(token)
test('sessão expira em 30 dias', ...)                   // agora += 30 dias + 1ms → usuarioDaSessao(token) === null
test('sair invalida a sessão', ...)
// conta-rotas.test.js (criarNavegador)
test('cadastrar responde 201, entra e o cookie é HttpOnly e SameSite=Lax', ...)
test('/api/conta/eu com e sem login', ...)              // com: {usuario:{id,nome,email}}; sem: {usuario:null}
test('sair apaga a sessão e o cookie', ...)             // depois: eu → null; reusar o token antigo → null
test('token inventado é tratado como sem login', ...)   // cookie 'sessao=inventado' → eu → {usuario:null}
test('escrita sem JSON é recusada', ...)                // tipo 'text/plain' → 400 'Envie os dados em JSON.'
test('JSON malformado é 400 Dados inválidos', ...)
test('respostas nunca contêm senha nem hash', ...)      // JSON.stringify(corpo) não contém a senha nem 'scrypt$'
```

- [ ] **Passo 2: Rodar e ver falhar.** `npm test` → FALHA.
- [ ] **Passo 3: Implementar** `erros.js`, `cookies.js`, `contas.js`, as rotas em `app.js`, o ajudante de teste e o `index.js`.
- [ ] **Passo 4: Rodar e ver passar.** `npm test` → todos PASSAM, incluindo os 67 testes da fase 1, sem nenhuma alteração neles.
- [ ] **Passo 5: Conferir no servidor real.** Com `curl`, cadastrar, receber o `Set-Cookie` e chamar `/api/conta/eu` com o cookie. Esperado: o usuário aparece. Conferir que `dados/em-cartaz.db` existe e que `git status` não o mostra.
- [ ] **Passo 6: Commit.** `git commit -m "feat: contas, login e sessões"`

---

### Task 3 (Tarefa 3): Avaliações

**Arquivos:**
- Criar: `server/comunidade.js`.
- Alterar: `server/app.js`.
- Teste: `test/avaliacoes.test.js`.

**Interfaces:**
- **Consome:** `ErroPedido`, `req.usuario` e `criarNavegador` (Tarefa 2).
- **Produz `criarComunidade(db, { agora = Date.now })`** com três funções:
  - `avaliacoesDoFilme(filmeId, usuarioId | null)` devolve `{ media: number | null, total: number, minha: Avaliacao | null, outras: Avaliacao[] }`.
    - `media` é arredondada para 1 casa decimal.
    - `outras` vem da mais nova para a mais antiga.
    - `Avaliacao = { id, autor: string, nota, texto, criadoEm: ISO, editada: boolean }`, em que `editada` significa `atualizado_em > criado_em`.
  - `salvarAvaliacao(usuarioId, filmeId, { nota, texto = '' })` cria ou atualiza a avaliação e devolve `Avaliacao`.
    - Usa `INSERT ... ON CONFLICT(usuario_id, filme_id) DO UPDATE`.
    - O texto passa por `trim`.
  - `apagarAvaliacao(usuarioId, filmeId)` apaga ou lança `ErroPedido(404, 'Você ainda não avaliou este filme.')`.
- **Rotas:** o `:id` é validado com `^[1-9]\d*$`; se não passar, a resposta é 404 com `'Filme não encontrado.'`.
  - `GET /api/filme/:id/avaliacoes` não exige login.
  - `PUT /api/filme/:id/avaliacao` exige login (401) e responde 200 com `Avaliacao`.
  - `DELETE /api/filme/:id/avaliacao` exige login e responde 204.
- **Ajudante interno de `app.js`:** `exigirLogin(req)` lança `ErroPedido(401, 'Entre na sua conta para continuar.')` quando não há `req.usuario`.

**Explicar:**
- `PUT` (criar ou trocar) versus `POST`, e `DELETE`.
- Média com `AVG` no SQL e `JOIN` para buscar o nome do autor.
- Por que o servidor usa o usuário da sessão e nunca um "usuarioId" enviado pelo navegador.

**Pergunta ao estudante:** "Por que a rota de salvar avaliação não recebe o id do usuário no corpo do pedido?"

- [ ] **Passo 1: Escrever os testes que falham:**

```js
test('filme sem avaliações: media null, total 0', ...)
test('avaliar sem login é 401', ...)
test('avaliar, ler e ver a média', ...)          // Ana 8, Bia 9 → media 8.5, total 2; Ana vê a dela em "minha" e a da Bia em "outras"
test('avaliar de novo edita (uma por pessoa)', ...)  // Ana 8 → 6: total 1, nota 6, editada true
test('nota e texto são validados', ...)          // 0, 11, 7.5, '8', null → mensagem da nota; 5001 caracteres → mensagem do texto
test('apagar a própria avaliação; apagar sem ter é 404', ...)
test('cada um só mexe na própria avaliação', ...) // Bia faz DELETE → 404 (Bia não avaliou); a de Ana continua
test('avaliações não expõem e-mail', ...)        // JSON.stringify(corpo) não contém '@'
test('id de filme inválido é 404', ...)          // /api/filme/abc/avaliacoes
```

- [ ] **Passo 2: Rodar e ver falhar.** `npm test` → FALHA.
- [ ] **Passo 3: Implementar** `comunidade.js` (avaliações) e as rotas.
- [ ] **Passo 4: Rodar e ver passar.** `npm test` → todos PASSAM.
- [ ] **Passo 5: Commit.** `git commit -m "feat: avaliações da comunidade"`

---

### Task 4 (Tarefa 4): Comentários com respostas

**Arquivos:**
- Alterar: `server/comunidade.js`, `server/app.js`.
- Teste: `test/comentarios.test.js`.

**Interfaces:**
- **Produz `comentariosDoFilme(filmeId, usuarioId | null)`**, que devolve `Comentario[]`, do mais novo para o mais antigo.
  - `Comentario = { id, autor: string | null, texto: string | null, apagado: boolean, criadoEm, meu: boolean, respostas: Resposta[] }`.
  - As respostas vêm em ordem de chegada, e `Resposta = { id, autor, texto, criadoEm, meu, respostaA }`.
  - Um comentário apagado vem com `autor: null`, `texto: null` e `meu: false`. Se ele não tiver respostas, fica fora da lista.
- **Produz `comentar(usuarioId, filmeId, { texto, respostaA = null })`**, que devolve um `Comentario` ou uma `Resposta`.
  - O texto passa por `trim` e é validado.
  - Se `respostaA` apontar para uma resposta, a nova resposta entra no comentário-pai dela (um nível só).
  - Se `respostaA` não existir, for de outro filme ou apontar para um comentário apagado, a função lança `ErroPedido(404, 'Comentário não encontrado.')`.
- **Produz `apagarComentario(usuarioId, comentarioId)`.**
  - Lança 404 se o comentário não existir ou já estiver apagado.
  - Lança 403 se for de outra pessoa.
  - Um comentário com respostas recebe `apagado = 1, texto = ''` (o texto é apagado de verdade). Sem respostas, a linha é apagada.
  - Uma resposta tem a linha apagada.
- **Rotas:**
  - `GET /api/filme/:id/comentarios`.
  - `POST /api/filme/:id/comentarios` com `{ texto, respostaA? }` responde 201.
  - `DELETE /api/comentarios/:id` responde 204, e um id inválido responde 404.

**Explicar:**
- Uma tabela que aponta para ela mesma (`resposta_a`).
- Como montar a "árvore" de um nível a partir de linhas soltas.
- O status 403 versus o 401.
- Por que apagar de verdade o texto (privacidade).

**Pergunta ao estudante:** "Por que mostrar 'Comentário apagado' em vez de sumir com o comentário quando ele tem respostas?"

- [ ] **Passo 1: Escrever os testes que falham:**

```js
test('comentar sem login é 401', ...)
test('comentário e respostas na ordem certa', ...)   // c1 depois c2: lista [c2, c1]; respostas de c1 em ordem de chegada
test('responder a uma resposta entra no mesmo comentário', ...)  // respostaA = id de uma resposta → respostas do pai
test('respostaA inexistente, de outro filme ou apagado é 404', ...)
test('texto vazio, só espaços ou com mais de 2000 caracteres é recusado', ...)
test('apagar comentário de outra pessoa é 403', ...)
test('apagar comentário com respostas mostra "apagado" e mantém as respostas', ...)  // autor null, texto null, e o texto some do banco
test('apagar comentário sem respostas some da lista', ...)
test('comentário apagado cuja última resposta foi apagada some', ...)
test('comentários nunca aparecem em /api/filme/:id nem em /avaliacoes', ...)  // texto único 'SPOILER-XYZ' não aparece nessas respostas
test('comentários não expõem e-mail', ...)
```

- [ ] **Passo 2: Rodar e ver falhar.** `npm test` → FALHA.
- [ ] **Passo 3: Implementar** os comentários e as rotas.
- [ ] **Passo 4: Rodar e ver passar.** `npm test` → todos PASSAM.
- [ ] **Passo 5: Commit.** `git commit -m "feat: discussão com comentários e respostas"`

---

### Task 5 (Tarefa 5): Páginas de entrar e cadastrar, e a conta no cabeçalho

**Arquivos:**
- Criar: `public/entrar.html`, `public/cadastrar.html`, `public/js/conta.js`, `public/js/cabecalho.js`, `public/js/navegacao.js`.
- Alterar: `public/js/api.js`, `public/js/componentes.js`, `public/index.html`, `public/busca.html`, `public/filme.html`, `public/css/estilo.css`.
- Teste: `test/navegacao.test.js`, `test/componentes.test.js`.

**Interfaces:**
- **Produz `navegacao.js`:**
  - `destinoSeguro(volta)` devolve `volta` se ela casar com `/^(index|busca|filme)\.html(\?[^#]*)?$/`. Em qualquer outro caso, devolve `'index.html'`.
  - `linkEntrar(destino)` devolve `` `entrar.html?volta=${encodeURIComponent(destino)}` ``.
- **Produz `areaConta(usuario | null, destinoAtual)` em `componentes.js`.**
  - Sem login, mostra um link "Entrar" para `linkEntrar(destinoAtual)`.
  - Com login, mostra "Olá, *nome*" (escapado) e `<button data-sair>Sair</button>`.
- **Produz em `api.js`:**
  - `enviarJson(url, metodo, corpo = {})` usa `fetch` com `Content-Type: application/json` e reaproveita o tratamento de erro do `pedirJson`. Respostas 204 devolvem `null`.
  - As funções novas são `cadastrar`, `entrar`, `sair` e `quemSouEu`, mais estas, que a Tarefa 6 usa: `carregarAvaliacoes`, `salvarAvaliacao`, `apagarAvaliacao`, `carregarComentarios`, `comentar` e `apagarComentario`.
- **Altera as páginas:**
  - Todas recebem um `<div class="conta" id="conta"></div>` no cabeçalho.
  - O `cabecalho.js` é carregado em todas. Ele chama `quemSouEu()`, preenche a área com `areaConta` e, ao clicar em "Sair", chama `sair()` e recarrega a página.
  - `entrar.html` e `cadastrar.html` usam formulários com `<label>`, `autocomplete` (`email`, `current-password` ou `new-password`, `nickname`) e uma área de mensagem `aria-live`. Cada uma tem um link para a outra, mantendo o `volta`.
  - Quando dá certo, a página vai para `location.href = destinoSeguro(volta)`.

**Explicar:**
- Formulários com `fetch` e JSON.
- Por que o JavaScript não consegue ler o cookie `HttpOnly` e por isso pergunta `/api/conta/eu`.
- O que é um *open redirect* e como `destinoSeguro` impede.

**Pergunta ao estudante:** "O que poderia acontecer se a página aceitasse `volta=https://site-falso.com`?"

- [ ] **Passo 1: Escrever os testes que falham:**

```js
// navegacao.test.js
test('destinoSeguro aceita páginas nossas', ...)   // 'filme.html?id=550', 'busca.html?q=a%20b', 'index.html'
test('destinoSeguro recusa o resto', ...)          // 'https://mal.com', '//mal.com', 'javascript:alert(1)', '', null, '/etc', 'filme.html#x' → 'index.html'
test('linkEntrar codifica o destino', ...)         // 'filme.html?id=550' → 'entrar.html?volta=filme.html%3Fid%3D550'
// componentes.test.js
test('areaConta sem login mostra Entrar com volta', ...)
test('areaConta com login escapa o nome e mostra Sair', ...)  // nome '<b>x</b>'
```

- [ ] **Passo 2: Rodar e ver falhar.** `npm test` → FALHA.
- [ ] **Passo 3: Implementar** os módulos puros, `api.js`, as páginas, os scripts e o CSS (formulário no visual "Em Cartaz", mobile-first).
- [ ] **Passo 4: Rodar e ver passar.** `npm test` → todos PASSAM.
- [ ] **Passo 5: Conferir no Chrome sem janela (headless).** `--dump-dom` de `entrar.html` e de `index.html` → o cabeçalho mostra "Entrar".
- [ ] **Passo 6: Commit.** `git commit -m "feat: páginas de entrar e cadastrar"`

---

### Task 6 (Tarefa 6): Página do filme com nota da comunidade, avaliações e discussão; README

**Arquivos:**
- Criar: `public/js/comunidade.js`.
- Alterar: `public/js/componentes.js`, `public/js/filme.js`, `public/css/estilo.css`, `README.md`.
- Teste: `test/componentes.test.js`.

**Interfaces:**
- **Consome:** as funções de `api.js` (Tarefa 5) e o formato `Avaliacao` e `Comentario` (Tarefas 3 e 4).
- **Produz componentes puros:**
  - `notaComunidade({ media, total })` mostra:
    - "Comunidade: ★ 8,2 (12 avaliações)";
    - no singular, "(1 avaliação)";
    - com `total` 0, "Ainda sem avaliações da comunidade".
  - `cartaoAvaliacao(av, { minha })` mostra autor, data, "★ N/10", o texto (se houver) e "(editada)". Quando `minha` for verdadeiro, mostra os botões `data-editar-avaliacao` e `data-apagar-avaliacao`.
  - `formularioAvaliacao(minha | null)`:
    - tem a nota em `<select>` de 1 a 10 e um `<textarea maxlength="5000">` opcional;
    - o botão diz "Publicar avaliação", ou "Salvar alterações" quando a pessoa já tem uma avaliação.
  - `avisoSpoiler()` mostra o texto "Esta área pode conter spoilers." e `<button data-abrir-discussao>Já assisti, quero ver</button>`.
  - `cartaoComentario(c, { logado })`:
    - um comentário apagado aparece como "Comentário apagado";
    - as respostas aparecem dentro dele;
    - "Responder" aparece só para quem tem login, com `data-responder="<id>"` e `data-nome="<autor>"`;
    - "Apagar" aparece só quando é `meu`, com `data-apagar-comentario`.
  - `pedirLogin(acao, destino)` mostra o link "Entre para avaliar" ou "Entre para comentar".
- **Ordem das seções na página:** Onde assistir → Avaliações (`notaComunidade`, o formulário ou `pedirLogin`, e a lista) → Resenhas do TMDB → Discussão (com spoilers).
- **Ao lado da nota do TMDB,** no topo, aparece `notaComunidade`.
- **A página carrega em paralelo** o filme, as avaliações e `quemSouEu`. Se as avaliações falharem, a página continua sem a parte da comunidade.
- **A Discussão:**
  - começa com `avisoSpoiler()`;
  - só depois do clique chama `carregarComentarios`;
  - lembra a escolha em `localStorage['discussao-aberta-' + id]`, sempre com `try/catch`.
- **Responder** abre um campo já com "@nome ". **Apagar** pede `confirm('Apagar este comentário?')`, e depois a lista é recarregada.
- **README:** uma seção "Comunidade (fase 2)" explicando como criar duas contas para testar, onde fica o banco e como apagar o banco para recomeçar (apagar `dados/em-cartaz.db`).

**Explicar:**
- `Promise.all` com falha tolerada (`Promise.allSettled`).
- Carregar sob demanda, e por que isso protege de spoilers.
- `localStorage` e por que ele fica num `try/catch`.

**Pergunta ao estudante:** "Por que os comentários só são pedidos ao servidor depois do clique, e não escondidos com CSS?"

- [ ] **Passo 1: Escrever os testes que falham:**

```js
test('notaComunidade: vazia, singular e plural com vírgula', ...)
test('cartaoAvaliacao escapa texto e autor; botões só na minha', ...)
test('formularioAvaliacao novo e editando', ...)    // select tem 1..10; editando: nota marcada, texto preenchido e escapado
test('avisoSpoiler tem o botão de abrir', ...)
test('cartaoComentario: apagado, respostas, Responder só com login, Apagar só no meu', ...)
test('cartaoComentario escapa texto e nome, inclusive em data-nome', ...)
test('pedirLogin usa linkEntrar com o destino', ...)
```

- [ ] **Passo 2: Rodar e ver falhar.** `npm test` → FALHA.
- [ ] **Passo 3: Implementar** os componentes, `comunidade.js`, as mudanças em `filme.js`, o CSS e o README.
- [ ] **Passo 4: Rodar e ver passar.** `npm test` → todos PASSAM.
- [ ] **Passo 5: Conferir no Chrome headless.** `filme.html?id=550` sem login → mostra "Ainda sem avaliações da comunidade", "Entre para avaliar" e o aviso de spoiler, e o DOM não contém nenhum comentário.
- [ ] **Passo 6: Commit.** `git commit -m "feat: comunidade na página do filme"`

**Lista de conferência manual (para o Gabryel, com duas contas: uma no Chrome normal e outra numa janela anônima):**
1. Criar a conta A, avaliar o Clube da Luta com 8 e um texto.
2. Criar a conta B, avaliar com 9 e conferir a nota da comunidade, 8,5 com 2 avaliações.
3. Com B, abrir a Discussão e comentar. Com A, responder.
4. Com B, responder à resposta: a nova mensagem começa com "@A" e fica no mesmo comentário.
5. Com A, tentar apagar o comentário de B: o botão não aparece.
6. Com B, apagar o próprio comentário, que tem respostas: aparece "Comentário apagado" com as respostas.
7. Sair, recarregar e conferir: a Discussão do filme ainda abre direto (o navegador lembrou), mas "Responder" não aparece.
8. Num filme novo, conferir que a Discussão começa fechada.
9. Escrever `<b>oi</b>` num comentário: aparece como texto.
