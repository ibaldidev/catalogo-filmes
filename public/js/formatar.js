// Funções puras de formatação, usadas pelas páginas (e testadas no Node).

// Troca caracteres especiais para que um texto vindo de fora
// apareça como texto, e nunca seja interpretado como HTML.
export function escaparHtml(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replaceAll('&', '&amp;') // o & primeiro, senão estragaria os outros
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Endereço completo de uma imagem do TMDB. Tamanhos comuns: w92, w185, w342, w500.
export function urlImagem(caminho, tamanho = 'w342') {
  if (!caminho) return null;
  return `https://image.tmdb.org/t/p/${tamanho}${caminho}`;
}

// 8.4 → "8,4" (com vírgula, como no Brasil)
export function formatarNota(nota) {
  if (nota === null || nota === undefined) return '–';
  return nota.toFixed(1).replace('.', ',');
}

// Nota de 0 a 10 → estrelas de 0 a 5, com meia estrela (como no Letterboxd).
// 8 → "★★★★", 7 → "★★★½", 8,4 → "★★★★" (arredonda para a meia estrela mais próxima)
export function estrelas(nota) {
  if (nota === null || nota === undefined) return '';
  const meias = Math.round(Math.min(Math.max(nota, 0), 10)); // quantas meias estrelas: 0 a 10
  return '★'.repeat(Math.floor(meias / 2)) + (meias % 2 === 1 ? '½' : '');
}

// 139 → "2h 19min"
export function formatarDuracao(minutos) {
  if (!minutos) return '';
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto}min`;
  if (resto === 0) return `${horas}h`;
  return `${horas}h ${resto}min`;
}

// Corta um texto longo, dizendo se cortou ou não.
export function cortarTexto(texto, limite) {
  if (texto.length <= limite) return { curto: texto, cortado: false };
  return { curto: texto.slice(0, limite).trimEnd() + '…', cortado: true };
}
