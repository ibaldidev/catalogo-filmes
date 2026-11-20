# Em Cartaz, fase 2: comunidade (design)

**Status:** rascunho para aprovação do Gabryel (2026-11-19).
**Base:** a fase 1 (`2026-11-18-catalogo-filmes-design.md`) está pronta e continua valendo.

## 1. Intenção e porquê
O site existe para quem gosta de filmes descobrir o que vale a pena assistir agora. Na fase 1, tudo vinha do TMDB. Na fase 2, as próprias pessoas do site passam a contribuir:
- dando a nota delas;
- escrevendo o que acharam;
- conversando sobre o filme.

Assim, quem chega ao site lê opiniões de gente como ela, e não só números de outro site.

## 2. Público
Pessoas comuns que gostam de **ler algo sobre o filme antes de assistir**. Daí sai a regra mais importante desta fase: **quem ainda não assistiu não pode tomar spoiler sem querer.**

Elas também escrevem e respondem. Por enquanto, quem usa o site são as pessoas que acessam o seu computador, porque a fase 2 é um **ambiente de teste local**.

## 3. Onde esta fase se encaixa
- **Fase 1 (pronta):** catálogo, busca, onde assistir e resenhas do TMDB com tradução.
- **Fase 2 (este documento):** contas, avaliações e discussão, tudo funcionando **no computador**, com um banco de dados de teste.
- **Depois (passo separado, a planejar):** colocar o site na internet. A seção 13 lista o que esse passo vai exigir.

## 4. Objetivos
1. **Contas.**
   - Cadastro com e-mail, senha e um nome de exibição.
   - Entrar e sair.
   - O cabeçalho mostra "Entrar" ou "Olá, *nome*" com um "Sair".
2. **Avaliações (sem spoilers).**
   - Na página do filme, cada pessoa com conta dá **uma** avaliação por filme: uma nota inteira de 1 a 10 e um texto opcional.
   - Ela pode editar ou apagar a própria avaliação.
   - A página mostra a **nota da comunidade**, que é a média com uma casa decimal e vírgula, mais o número de avaliações. Essa nota fica ao lado da nota do TMDB.
3. **Discussão (com spoilers).**
   - É uma área da página do filme que começa **fechada**, com o aviso "Esta área pode conter spoilers" e o botão "Já assisti, quero ver".
   - Dentro dela há comentários e **respostas em um nível**.
   - Cada pessoa pode apagar o que ela mesma escreveu.
4. **Ler não exige conta; escrever exige.** Quem não entrou vê "Entre para avaliar" e "Entre para comentar". Depois de entrar, a pessoa volta para o mesmo filme.

## 5. Não-objetivos (fora da fase 2)
- Colocar o site na internet (hospedagem).
- Confirmação de e-mail e "esqueci minha senha", porque os dois exigem um serviço de envio de e-mail.
- Denunciar conteúdo, moderadores e bloqueio de usuários.
- Curtidas, notificações e página de perfil pública.
- Editar comentários. Comentários só podem ser apagados; avaliações podem ser editadas.
- Mostrar dados da comunidade na página inicial e na busca. Nesta fase, eles aparecem só na página do filme.
- Entrar com Google ou outras contas externas.
- Separar spoilers nas resenhas do TMDB. Elas continuam como estão.
- Paginação de avaliações e comentários. Com poucos usuários de teste, tudo aparece de uma vez.

## 6. Anti-objetivos (seria um fracasso, mesmo funcionando)
- **Spoiler vazando.** Os comentários da Discussão aparecem para quem não clicou em "Já assisti", ou aparecem em qualquer outro lugar do site.
- **Senha exposta.** A senha é guardada em texto, aparece em logs ou é devolvida pela API.
- **Mexer no que é dos outros.** Alguém consegue apagar ou editar avaliação ou comentário de outra pessoa.
- **Texto virando código.** Texto escrito por usuário vira HTML na página (XSS).
- **E-mail exposto.** O e-mail de alguém aparece para outras pessoas. Só o nome de exibição é público.
- **Quebrar a fase 1.** O site deixa de funcionar para quem não tem conta, ou o catálogo depende do banco de dados.

## 7. Restrições
- **Nenhuma dependência nova.** Só Express, que já existe, mais o que vem com o Node.js 26: `node:sqlite` e `node:crypto`.
- **Sem custos e sem contas em serviços externos.**
- **Português do Brasil** em toda a interface.
- **Mesmo estilo da fase 1:** HTML, CSS e JavaScript puro, mobile-first e o visual "Em Cartaz".
- **O banco de dados é um arquivo local fora do git**, porque ele terá e-mails e dados de teste.
- **Dados pessoais no mínimo (LGPD):** guardamos só o e-mail, o nome de exibição e o hash da senha.

## 8. Abordagens consideradas
- **A) Tudo feito por nós, com o que vem no Node.js.** **Escolhida pelo Gabryel.**
  - SQLite embutido, com SQL escrito à mão.
  - Hash de senha com `node:crypto`.
  - Login por cookie de sessão guardado no banco.
  - Ganhos: zero dependências, zero custo e o aprendizado dos fundamentos.
  - Custos: mais código, e a segurança fica por nossa conta, coberta por testes.
- **B) Um serviço pronto (Supabase ou Firebase).** Exige conta já, não é um banco local de teste, ensina o jeito do serviço e não os fundamentos, e o plano grátis pausa projetos parados.
- **C) Ferramentas prontas (Prisma e Passport).** São muitas peças novas ao mesmo tempo, e elas escondem justamente o SQL e o login que queremos entender.

## 9. Decisões tomadas pelo Gabryel
- O público são pessoas que leem antes de assistir.
- O banco de dados é de teste, local.
- Os spoilers ficam em **duas áreas separadas**: "Avaliações" (sem spoilers, aberta) e "Discussão (com spoilers)" (fechada até "Já assisti, quero ver").
- A discussão tem **comentários com respostas** (como no YouTube).
- A construção segue a abordagem **A**.

## 10. Decisões do Claude (para o Gabryel conferir; mudar é barato agora)

**Conta**
- O e-mail é único, e maiúsculas não contam (`Ana@x.com` é o mesmo que `ana@x.com`).
- O nome de exibição é único, com 2 a 30 caracteres. Ele é único para o "@nome" das respostas não ser ambíguo.
- A senha tem pelo menos 8 caracteres.
- O hash da senha usa `scrypt` com um "sal" aleatório por pessoa, e a comparação é feita em tempo constante.
- Se o login falhar, a mensagem é sempre a mesma, "E-mail ou senha incorretos.", e não revela se o e-mail existe.

**Sessão**
- Um cookie `HttpOnly` e `SameSite=Lax` guarda um código aleatório.
- No banco fica só o **hash** desse código. Assim, quem copiar o arquivo do banco não consegue entrar como os outros.
- A sessão vale 30 dias, e "Sair" apaga a sessão no banco.

**Proteção contra pedidos forjados**
- Toda escrita exige sessão e um corpo JSON (`Content-Type: application/json`). Com o cookie `SameSite=Lax`, isso protege contra outro site enviar pedidos em nome da pessoa (CSRF).

**Avaliações e comentários**
- A nota é um número inteiro de 1 a 10.
- O texto da avaliação tem no máximo 5.000 caracteres, e o do comentário, no máximo 2.000. Espaços nas pontas são removidos, e um comentário vazio é recusado.
- **Filme sem avaliações:** no lugar da nota da comunidade aparece "Ainda sem avaliações da comunidade".
- **Ordem das avaliações:** a da própria pessoa vem primeiro, com "Editar" e "Apagar". As outras vêm da mais nova para a mais antiga.
- **Respostas:**
  - Responder a uma resposta cria uma nova resposta no mesmo comentário, começando com "@nome ".
  - Os comentários aparecem do mais novo para o mais antigo, e as respostas, em ordem de chegada.
- **Apagar:**
  - Um comentário com respostas, quando apagado, vira "Comentário apagado", e as respostas continuam visíveis.
  - Sem respostas, ele some.
  - Uma resposta apagada some.
  - Um comentário apagado que fica sem nenhuma resposta deixa de aparecer.

**Spoilers**
- Os comentários **só são pedidos ao servidor depois** do clique em "Já assisti, quero ver". Eles nem chegam ao navegador antes disso.
- O navegador lembra, por filme, que a pessoa já abriu a Discussão, para não perguntar de novo.

**Volta depois de entrar**
- "Entre para avaliar" leva a `entrar.html?volta=filme.html?id=N`.
- O `volta` só aceita endereços do próprio site, começando com uma página nossa. Isso impede que um link malicioso mande a pessoa para outro site.

**O filme avaliado**
- Na escrita, o id do filme é validado só pelo formato, com a mesma regra da fase 1. Não consultamos o TMDB a cada escrita.

**Onde ficam os dados**
- O banco fica em `dados/em-cartaz.db`, e a pasta `dados/` vai para o `.gitignore`.
- As tabelas são criadas automaticamente quando o servidor liga.
- Os testes usam um banco **na memória** (`:memory:`), novo a cada teste.

## 11. Como funciona por dentro (visão geral)

**Tabelas**
- `usuarios`: `id`, `email` (único), `nome` (único), `hash_senha`, `criado_em`.
- `sessoes`: `hash_token`, `usuario_id`, `expira_em`.
- `avaliacoes`: `id`, `usuario_id`, `filme_id`, `nota`, `texto`, `criado_em`, `atualizado_em`. Cada usuário tem no máximo uma por filme (`UNIQUE(usuario_id, filme_id)`).
- `comentarios`: `id`, `filme_id`, `usuario_id`, `resposta_a` (vazio num comentário; o id do comentário numa resposta), `texto`, `apagado`, `criado_em`.

**Servidor (pastas novas e rotas novas; o que existe continua igual)**
- `server/banco.js` abre o SQLite e cria as tabelas.
- `server/senhas.js` gera e confere o hash.
- `server/contas.js` cuida do cadastro, do login e das sessões.
- `server/comunidade.js` cuida das avaliações e dos comentários.
- Rotas novas:
  - `POST /api/conta/cadastrar`
  - `POST /api/conta/entrar`
  - `POST /api/conta/sair`
  - `GET /api/conta/eu`
  - `GET /api/filme/:id/avaliacoes`
  - `PUT /api/filme/:id/avaliacao` (criar ou editar a própria)
  - `DELETE /api/filme/:id/avaliacao`
  - `GET /api/filme/:id/comentarios`
  - `POST /api/filme/:id/comentarios`
  - `DELETE /api/comentarios/:id`
- **Códigos de resposta (os mesmos da fase 1, mais dois):**
  - 400 para dados inválidos, com uma mensagem clara em português;
  - **401** para quem precisa entrar;
  - **403** para quem tenta mexer no que é de outra pessoa;
  - 404 para o que não existe.

**Navegador**
- Páginas novas: `entrar.html` e `cadastrar.html`.
- O cabeçalho de todas as páginas passa a mostrar o estado da conta.
- A página do filme ganha:
  - a nota da comunidade;
  - a seção "Avaliações", com o formulário de nota e texto;
  - a seção "Discussão (com spoilers)", fechada.
- Todo texto de usuário entra na página por `escaparHtml` ou `textContent`, como na fase 1.

## 12. Como a construção deve acontecer
- O mesmo jeito da fase 1: um plano com tarefas pequenas e testes escritos antes do código.
- O Claude escreve o código e explica cada parte nova: SQL, hash, cookie, sessão, 401 e 403.
- O Gabryel testa no navegador com duas contas, para ver uma pessoa responder a outra e conferir que não dá para apagar o que é do outro.
- A revisão de segurança dá atenção especial aos anti-objetivos da seção 6.

## 13. Antes de ir para a internet (fica registrado, não é desta fase)
- Uma hospedagem que guarde o arquivo do banco, ou a troca para um banco hospedado.
- Um limite de tentativas de login, contra quem tenta adivinhar senhas.
- Denunciar conteúdo e moderação.
- Envio de e-mail, para a confirmação e o "esqueci minha senha".
- Uma página de privacidade e a opção "apagar minha conta", exigidas pela LGPD.
- HTTPS (o cookie passa a ser `Secure`).

## 14. O que fica a cargo do construtor
- A divisão exata em funções, os nomes internos e as mensagens de validação, desde que sejam claras e em português.
- O layout dos formulários e das listas, dentro do visual "Em Cartaz".
- Como os testes montam usuários e sessões falsas.
