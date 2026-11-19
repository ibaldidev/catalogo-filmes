// Ponto de partida: é este arquivo que "npm run dev" e "npm start" executam.

import { criarApp } from './app.js';
import { criarClienteTmdb } from './tmdb.js';

const token = process.env.TMDB_TOKEN;
if (!token || token === 'coloque-seu-token-aqui') {
  console.error('Falta o TMDB_TOKEN no arquivo .env');
  process.exit(1);
}

const porta = process.env.PORT || 3000;
const app = criarApp({ tmdb: criarClienteTmdb({ token }) });

app.listen(porta, () => {
  console.log(`Site rodando em http://localhost:${porta}`);
});
