# Catálogo de Filmes no Streaming — Design

Data: 2026-11-18
Status: rascunho para aprovação

## 1. Intenção e porquê

Um site para quem gosta de cinema descobrir **o que vale a pena assistir agora** nos serviços de streaming disponíveis no Brasil, buscar um filme e saber **onde assistir**, e ver **notas e avaliações** de outras pessoas. No futuro, as pessoas também vão poder **discutir** os filmes dentro do próprio site.

Este também é um **projeto de aprendizado**. Quem vai construí-lo é um estudante de programação com pouca experiência prática, que quer aprender enquanto constrói. A construção precisa explicar cada conceito e fazer perguntas ao longo do caminho, em vez de só entregar código pronto. Código simples e legível vale mais do que código esperto.

## 2. Público

Pessoas no Brasil que gostam de filmes e usam serviços de streaming. Elas chegam ao site com uma de duas intenções:
- "Quero assistir algo bom hoje, o que tem de melhor nos meus streamings?"
- "Quero ver o filme X, onde ele está?"

A maioria vai acessar pelo celular.

## 3. Fases

**Fase 1 (escopo deste documento):** só dados do TMDB, sem contas de usuário.
**Fase 2 (futuro, fora de escopo):** comunidade própria, com contas, notas, resenhas e discussões. A fase 2 vai usar o mesmo servidor Node.js, então a fase 1 não deve fechar esse caminho. Fora isso, não precisa se preparar para ela.

## 4. Objetivos (fase 1)

1. **Página inicial: o melhor no streaming agora.** Uma lista de filmes disponíveis por assinatura no Brasil, ordenada por nota, que pode ser filtrada por serviço (Netflix, Prime Video, Max, Disney+ etc.).
2. **Busca por nome.** A pessoa digita o título e vê os resultados, mesmo para filmes que não estão em nenhum streaming.
3. **Página do filme.** Pôster, título em português, ano, duração, gêneros, sinopse, nota média do TMDB (com o número de votos), resenhas do TMDB e **onde assistir no Brasil**, separado por tipo de acesso: assinatura, grátis, com anúncios, aluguel e compra.
4. Funciona bem no celular e no computador.
5. Tudo em português do Brasil.

## 5. Não-objetivos (fase 1)

- Contas, login, notas ou comentários próprios (ficam para a fase 2).
- Séries de TV, só filmes.
- Regiões além do Brasil.
- App instalável ou publicação em loja de aplicativos.
- Notificações, listas pessoais ou "quero assistir".
- Monetização.

## 6. Anti-objetivos (seria um fracasso mesmo funcionando)

- **A chave do TMDB aparecer no navegador.** Ela deve existir só no servidor.
- **Código que o estudante não consegue entender ou explicar.** Isso inclui frameworks de frontend (React, Vue etc.), ferramentas de build (Webpack, Vite etc.) e abstrações desnecessárias.
- **Informação de "onde assistir" sem crédito ao JustWatch**, que é exigido pelo TMDB.
- **Um site que só funciona bem no computador.**

## 7. Restrições

- **API do TMDB v3**, com autenticação pelo token de leitura ("API Read Access Token") enviado no cabeçalho `Authorization: Bearer`. O token fica em uma variável de ambiente (arquivo `.env`, que não vai para o controle de versão).
- **Uso não comercial**, que é a condição da chave gratuita do TMDB.
- **Atribuições obrigatórias:**
  - TMDB: logo e o texto "This product uses the TMDB API but is not endorsed or certified by TMDB" (o texto pode ficar em português) no rodapé ou numa página "Sobre".
  - JustWatch: crédito visível junto da informação de onde assistir (por exemplo, "Dados de streaming: JustWatch").
- **Região e idioma:** `watch_region=BR` e `language=pt-BR` em todas as chamadas em que isso se aplica.
- **Limite do TMDB:** uma busca do tipo discover devolve no máximo 500 páginas de 20 resultados. Isso não é problema para a fase 1, que mostra só os melhores, com paginação ou "carregar mais".
- **Tecnologia escolhida:** HTML, CSS e JavaScript puro no navegador, com um servidor **Node.js + Express**.
- **Ambiente (verificado em 2026-11-18):** Windows 10, com Node.js v26, npm 11 e git 2.56 já instalados.

## 8. Abordagens consideradas

| Abordagem | Vantagens | Desvantagens |
|---|---|---|
| **A) HTML/CSS/JS + Node.js (Express)** ✅ escolhida | Ensina os fundamentos sem "mágica"; uma só linguagem (JavaScript) no navegador e no servidor; a fase 2 cabe no mesmo servidor | Mais trabalho manual |
| B) Next.js (React) | Padrão de mercado, bom para o currículo, deploy fácil | Muitos conceitos novos de uma vez para um iniciante |
| C) Python + Flask | Modelo mental simples (o servidor monta a página) | Menos interatividade; menos alinhado ao desejo de aprender a construir sites |

**Por que A:** o estudante quer aprender. A abordagem A expõe como um site funciona de verdade (navegador ↔ servidor ↔ API externa) e torna a migração futura para React mais fácil de entender.

## 9. Decisões já tomadas

**Com o estudante:**
- O produto é um site responsivo, não um app de loja.
- Fase 1 só com dados do TMDB; a comunidade própria fica para a fase 2.
- Tecnologia: abordagem A.
- O processo de construção é didático, com explicações e perguntas ao estudante.
- **Claude escreve o código e explica cada parte.** O estudante lê, roda e responde às perguntas. O plano, portanto, é feito de tarefas normais de implementação, com explicações e perguntas acopladas, e não de exercícios para o estudante resolver.
- **Ponto de partida do estudante:** viu um pouco de HTML e JavaScript na faculdade. Não mencionou terminal nem git, então os dois devem ser tratados como novos e explicados do zero. Ele **ainda não tem conta no TMDB**, então o primeiro passo do plano é criar a conta e obter o token de leitura junto com ele.

**Propostas minhas (Claude), que o estudante pode corrigir:**
- **Brasil e pt-BR apenas.** É onde está o público.
- **Uso não comercial**, para manter a chave gratuita.
- **O que significa "o melhor agora" na página inicial:** filmes com tipo de acesso "assinatura" (`flatrate`) no Brasil, ordenados por nota média (`vote_average.desc`), com **um mínimo de votos** (ponto de partida: `vote_count.gte=300`), para que um filme com 3 votos de nota 10 não fique no topo. Também haverá uma segunda forma de ordenar, **"Populares agora"** (`popularity.desc`), com a mesma lista de opções.
- **Filtro de serviços** com a lista oficial de provedores do TMDB para o Brasil (`/watch/providers/movie?watch_region=BR`). Na interface aparecem os principais primeiro (Netflix, Prime Video, Max, Disney+, Globoplay, Apple TV+, Paramount+), e é possível escolher mais de um.
- **Vários serviços selecionados:** mostrar filmes disponíveis em **qualquer um** deles (OU, `|` no TMDB), que corresponde a "nos meus streamings".
- **Resenhas:** mostrar as que existem no TMDB, mesmo em inglês (a maioria está em inglês), indicando o idioma. Como o TMDB não informa o idioma de cada resenha, o servidor busca as resenhas em pt-BR e em en-US separadamente e marca cada uma conforme a origem. Se não houver nenhuma, mostrar uma mensagem amigável. Resenhas longas aparecem cortadas, com "ler mais".
- **Busca:** usa `/search/movie`. Os resultados levam à página do filme, onde aparece onde assistir. A busca não filtra por streaming, porque a pessoa pode querer saber justamente que o filme *não* está disponível.
- **"Não disponível":** quando um filme não está em nenhum serviço no Brasil, a página diz isso claramente, em vez de deixar a seção vazia.

## 10. Como funciona por dentro (visão geral)

```
Navegador (HTML/CSS/JS)  ──pede──▶  Servidor Express (guarda a chave)  ──pede──▶  API TMDB
        ◀──── JSON simplificado ────          ◀──────── JSON ────────
```

- O **servidor** serve os arquivos estáticos (HTML, CSS, JS, imagens) e expõe algumas rotas próprias em `/api/...` que repassam as chamadas ao TMDB, adicionando a chave, a região e o idioma. Exemplos: descobrir filmes, buscar, detalhes do filme e lista de provedores.
- O **navegador** chama só essas rotas `/api/...`, nunca o TMDB diretamente. As imagens (pôsteres e logos) vêm direto do CDN de imagens do TMDB (`image.tmdb.org`), que não exige chave.
- **Páginas:** início (`/`), busca e filme (`/filme/:id` ou equivalente). A forma de navegar entre elas (páginas HTML separadas ou uma única página que troca o conteúdo) fica para o construtor, preferindo o que for mais simples de entender.

## 11. O que fica a cargo do construtor

- A estrutura de pastas e arquivos.
- Os nomes e formatos exatos das rotas `/api/...`, e quais campos do TMDB repassar.
- O visual (cores, tipografia, layout), desde que funcione bem no celular, siga as atribuições obrigatórias e tenha cara de catálogo de cinema.
- Paginação ou "carregar mais" na página inicial.
- Cache simples no servidor, se ajudar (por exemplo, a lista de provedores muda pouco).
- Os testes: quais e quanto. Devem ser no nível do aprendizado e servir também para ensinar o que é teste.
- Usar git desde o início (recomendado, explicando o porquê).
- Onde publicar o site na internet ao final da fase 1 (um serviço gratuito que rode Node.js). Rodar localmente vem primeiro.
- A ordem dos passos, que deve deixar o estudante ver algo funcionando cedo. Por exemplo: primeiro o servidor devolvendo um filme do TMDB, depois a página inicial, depois a busca, depois a página do filme.

## 12. Como a construção deve acontecer

- Cada passo começa explicando **o que** vamos fazer e **por que**, em português simples.
- Conceitos novos (servidor, rota, requisição HTTP, JSON, `fetch`, `async/await`, variável de ambiente, responsividade etc.) são explicados quando aparecem pela primeira vez.
- O estudante recebe perguntas ao longo do caminho para pensar junto, mesmo sem saber a resposta. Responder não bloqueia o próximo passo: as perguntas servem para aprender, não como portão.
- Passos pequenos, com algo visível funcionando ao fim de cada um.
