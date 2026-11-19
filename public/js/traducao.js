// Tradução das resenhas com o tradutor embutido do Chrome (Translator API).
// A tradução acontece no computador de quem visita: sem servidor, sem conta, sem custo.
// "ambiente" é o navegador (globalThis); os testes passam um navegador falso no lugar.

const IDIOMAS = { sourceLanguage: 'en', targetLanguage: 'pt' };

// O navegador consegue traduzir de inglês para português?
// Respostas possíveis do Chrome: 'unavailable', 'downloadable', 'downloading', 'available'.
export async function tradutorDisponivel(ambiente = globalThis) {
  if (!ambiente.Translator) return false; // celular, Firefox, Safari, Chrome antigo...
  try {
    return (await ambiente.Translator.availability(IDIOMAS)) !== 'unavailable';
  } catch {
    return false;
  }
}

// Cria o tradutor. Na primeira vez, o Chrome pode baixar o pacote de idioma;
// aoBaixar(fracao) recebe o progresso, de 0 a 1.
export function criarTradutor(ambiente, aoBaixar) {
  return ambiente.Translator.create({
    ...IDIOMAS,
    monitor(monitor) {
      monitor.addEventListener('downloadprogress', (evento) => aoBaixar(evento.loaded));
    },
  });
}

// Traduz um texto longo parágrafo por parágrafo (o tradutor tem limite de tamanho por pedido).
// split com parênteses na expressão guarda as quebras de linha na lista, para devolvê-las depois.
export async function traduzirTexto(texto, traduzir) {
  const pedacos = texto.split(/(\n+)/);
  const traduzidos = [];
  for (const pedaco of pedacos) {
    // Quebras de linha e linhas em branco ficam como estão.
    traduzidos.push(pedaco.trim() === '' ? pedaco : await traduzir(pedaco));
  }
  return traduzidos.join('');
}
