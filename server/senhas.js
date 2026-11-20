// Senhas nunca são guardadas como texto: guardamos um "hash" delas.
// Hash = uma moedora sem volta. Dá para moer de novo e comparar, mas não para desmoer.
//
// Formato guardado: "scrypt$<sal>$<hash>"
//   sal  = 16 bytes aleatórios, diferentes para cada senha. Assim, duas pessoas com a
//          mesma senha ficam com hashes diferentes, e tabelas prontas de senhas comuns
//          não servem para descobrir nada.
//   scrypt = uma moedora feita para ser lenta, o que atrapalha quem tenta adivinhar.

import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const TAMANHO_HASH = 64;

export function gerarHashSenha(senha) {
  const sal = randomBytes(16);
  const hash = scryptSync(senha, sal, TAMANHO_HASH);
  return `scrypt$${sal.toString('hex')}$${hash.toString('hex')}`;
}

// Mói a senha digitada com o mesmo sal e compara com o hash guardado.
export function conferirSenha(senha, guardado) {
  const partes = String(guardado ?? '').split('$');
  if (partes.length !== 3 || partes[0] !== 'scrypt') return false;

  const sal = Buffer.from(partes[1], 'hex');
  const esperado = Buffer.from(partes[2], 'hex');
  if (sal.length === 0 || esperado.length !== TAMANHO_HASH) return false; // texto estragado

  const calculado = scryptSync(String(senha), sal, TAMANHO_HASH);
  // timingSafeEqual leva sempre o mesmo tempo, acerte ou erre. Uma comparação comum
  // pararia no primeiro byte diferente, e medir esse tempo poderia dar pistas.
  return timingSafeEqual(calculado, esperado);
}
