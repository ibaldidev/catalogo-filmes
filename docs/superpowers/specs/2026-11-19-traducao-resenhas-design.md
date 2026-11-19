# Tradução das resenhas: design (curto)

**Status:** aprovado pelo Gabryel em 2026-11-19.

## Por quê
Muitas resenhas do TMDB estão em inglês, e o público do site lê em português. A pessoa quer conseguir ler a opinião antes de decidir o que assistir.

## Objetivos
- Um botão **"Traduzir para o português"** nas resenhas em inglês.
- Funcionar sem custo e sem conta.

## Fora do escopo
- Traduzir automaticamente, sem clique.
- Traduzir sinopses ou outros textos.
- Guardar as traduções no servidor.

## O que não pode acontecer (anti-objetivos)
- Gastar dinheiro ou exigir chave de API.
- Mostrar um botão que não funciona: no celular e em navegadores sem o tradutor, o botão não aparece.

## Abordagens consideradas
- **A) Tradutor embutido do Chrome (Translator API).** É grátis, roda no computador de quem visita e não precisa de conta. Só existe no Chrome de computador (versão 138 ou mais nova) e talvez no Edge. **Foi a escolhida**, para evitar gastos por agora.
- B) DeepL API Free. Traduz bem e funciona no celular, mas exige conta e, provavelmente, um cartão de crédito. Foi descartada por enquanto.

## Comportamento
- **Onde aparece:** só nas resenhas com `idioma === 'en-US'`.
- **Quando aparece:** o botão começa escondido. Ele é mostrado se `Translator.availability({ sourceLanguage: 'en', targetLanguage: 'pt' })` for diferente de `'unavailable'`.
- **Ao clicar:**
  - O botão mostra "Traduzindo…".
  - Se o pacote de idioma ainda não estiver no computador, o botão mostra "Baixando tradutor… N%".
  - Depois, aparece o texto **inteiro** traduzido, junto com a etiqueta "Traduzido pelo navegador".
  - O botão vira **"Ver original"**, que volta para o texto completo original.
- **Textos longos:** a tradução é feita parágrafo por parágrafo, porque o tradutor tem um limite por pedido.
- **Se falhar:** o botão mostra "Não foi possível traduzir agora. Tentar de novo".
- **O que fica no navegador:** a tradução de cada resenha fica guardada enquanto a página estiver aberta, então "Ver original" e depois "Traduzir" de novo não traduz outra vez.

## Decisões deixadas para quem constrói
- Os nomes dos arquivos e funções.
- O estilo visual, desde que siga o do site.
