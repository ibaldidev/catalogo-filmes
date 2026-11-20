// Formulários de "Entrar" e "Criar conta" (as duas páginas usam este mesmo arquivo).
// O <form> diz qual é pelo atributo data-modo="entrar" ou data-modo="cadastrar".

import { entrar, cadastrar } from './api.js';
import { destinoSeguro } from './navegacao.js';

const formulario = document.querySelector('#form-conta');
const mensagem = document.querySelector('#mensagem');
const linkOutraPagina = document.querySelector('#link-outra');

// Para onde voltar depois de dar certo (só páginas nossas: veja navegacao.js).
const volta = new URLSearchParams(location.search).get('volta');
const destino = destinoSeguro(volta);

// "Ainda não tem conta?" / "Já tem conta?" mantém o mesmo destino de volta.
if (volta) linkOutraPagina.href += `?volta=${encodeURIComponent(destino)}`;

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault(); // não deixa o navegador recarregar a página: quem envia somos nós
  const botao = formulario.querySelector('button[type="submit"]');
  // FormData lê todos os campos do formulário; Object.fromEntries vira { email, senha, ... }
  const dados = Object.fromEntries(new FormData(formulario));

  botao.disabled = true;
  mensagem.textContent = '';
  try {
    if (formulario.dataset.modo === 'cadastrar') await cadastrar(dados);
    else await entrar(dados);
    location.href = destino; // deu certo: o cookie já foi guardado pelo navegador
  } catch (erro) {
    mensagem.textContent = erro.message; // ex.: "E-mail ou senha incorretos."
    botao.disabled = false;
  }
});
