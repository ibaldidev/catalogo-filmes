// A parte da conta no cabeçalho, igual em todas as páginas: "Entrar" ou "Olá, nome · Sair".
// O cookie de login é HttpOnly, então este código NÃO consegue lê-lo (de propósito):
// em vez disso, pergunta ao servidor "quem sou eu?".

import { quemSouEu, sair } from './api.js';
import { areaConta } from './componentes.js';
import { destinoDe } from './navegacao.js';

// Outras partes da página (ex.: a comunidade na página do filme) usam esta mesma
// pergunta. Como o módulo só roda uma vez por página, o servidor é consultado uma vez só.
// Se der erro (servidor fora do ar), a pessoa é tratada como visitante.
export const usuarioAtual = quemSouEu().catch(() => null);

const area = document.querySelector('#conta');

// Partes marcadas com data-so-visitante (o convite para criar conta, a apresentação
// do site) somem para quem já entrou. Começam visíveis, porque a maioria é visitante.
usuarioAtual.then((usuario) => {
  if (!usuario) return;
  for (const parte of document.querySelectorAll('[data-so-visitante]')) parte.hidden = true;
});

if (area) {
  usuarioAtual.then((usuario) => {
    area.innerHTML = areaConta(usuario, destinoDe(location.pathname, location.search));
  });

  area.addEventListener('click', async (evento) => {
    if (!evento.target.closest('[data-sair]')) return;
    try {
      await sair();
    } finally {
      location.reload(); // recarrega para a página inteira voltar ao modo visitante
    }
  });
}
