// Confere se o token do TMDB funciona, buscando um filme conhecido (id 550).
// Como rodar: node --env-file=.env scripts/testar-conexao.js

import { criarClienteTmdb } from '../server/tmdb.js';

const cliente = criarClienteTmdb({ token: process.env.TMDB_TOKEN });

try {
  const filme = await cliente.detalhes(550);
  console.log(filme.title);
} catch (erro) {
  console.error('Não deu certo:', erro.message);
  if (erro.status === 401) console.error('Status 401 = token inválido. Confira o arquivo .env.');
  process.exitCode = 1;
}
