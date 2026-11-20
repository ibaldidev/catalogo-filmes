// Ponto de partida: é este arquivo que "npm run dev" e "npm start" executam.

import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { criarApp } from './app.js';
import { criarClienteTmdb } from './tmdb.js';
import { abrirBanco } from './banco.js';

const token = process.env.TMDB_TOKEN;
if (!token || token === 'coloque-seu-token-aqui') {
  console.error('Falta o TMDB_TOKEN no arquivo .env');
  process.exit(1);
}

const porta = process.env.PORT || 3000;
// O banco fica em dados/em-cartaz.db (a pasta é criada se não existir e está no .gitignore).
const pastaDados = fileURLToPath(new URL('../dados/', import.meta.url));
mkdirSync(pastaDados, { recursive: true });
const db = abrirBanco(pastaDados + 'em-cartaz.db');

const app = criarApp({ tmdb: criarClienteTmdb({ token }), db });

app.listen(porta, () => {
  console.log(`Site rodando em http://localhost:${porta}`);
});
