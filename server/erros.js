// Erro "esperado" de um pedido: dados inválidos (400), sem login (401),
// sem permissão (403), não encontrado (404)... O tratador de erros do app
// transforma este erro em resposta: status + { erro: mensagem }.
export class ErroPedido extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.name = 'ErroPedido';
    this.status = status;
  }
}
