// Valores fixos usados pelo servidor. Ficam num lugar só para ser fácil mudar.

export const REGIAO = 'BR';      // país dos streamings
export const IDIOMA = 'pt-BR';   // idioma de títulos e sinopses
export const MIN_VOTOS = 300;    // mínimo de votos para entrar em "Mais bem avaliados"
export const MAX_PAGINA = 500;   // o TMDB não devolve páginas além da 500

// Serviços que aparecem primeiro no filtro, nesta ordem:
// Netflix, Prime Video, Max, Disney+, Globoplay, Apple TV+, Paramount+
export const PROVEDORES_PRINCIPAIS = [8, 119, 1899, 337, 307, 350, 531];
