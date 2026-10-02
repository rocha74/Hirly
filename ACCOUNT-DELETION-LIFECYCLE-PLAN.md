# Exclusão de conta — bloqueio de escritas tardias

Data: 2026-09-09. **P1 aberto; correção ainda não implementada.**
Bloqueia a liberação com currículos reais. Não confundir testes de exclusão
sequencial aprovados com proteção contra operações simultâneas.

## Evidência

A revisão reproduziu com os handlers reais e Firestore em memória:

1. Uma chamada de IA inicia e aguarda resposta.
2. `deleteMyAccount` limpa os dados e retorna `{ deleted: true }`.
3. A IA termina e seu `finally` grava um novo `aiEvents` com o UID excluído.

Não foi excluída uma conta real para executar essa reprodução.

Arquivos envolvidos:

- `functions/accountDeletion.js`: limpa sequencialmente e exclui Auth por último.
- `functions/ai/handler.js`: auditoria no `finally`; `ai/quota.js`: reserva/liberação.
- `functions/applicationPackages.js`: transações do pacote e escritas posteriores
  de respostas aprovadas e interações.
- `functions/applicationQueue.js`: operações e resultados persistidos após processamento.
- `functions/externalApplicationSessions.js`: sessões, fila, candidaturas e materiais.
- `functions/jobModeration.js`: denúncias pessoais e suas cópias por vaga.
- `firestore.rules`, `storage.rules`: autorização do dono não consulta estado de exclusão.
- `src/services/cv.ts`, `profileDocuments.ts`: uploads REST e metadados em operações distintas.

O SDK de Functions instalado verifica o token sem solicitar `checkRevoked`.
Excluir Auth ou revogar refresh tokens não substitui uma barreira de escrita
para tokens emitidos e operações que já foram autorizadas.

## Contrato necessário

Criar estado mínimo do ciclo de vida em caminho separado de `users/{uid}`,
somente servidor. O marcador não deve conter CV, respostas ou perfil.

- `active`/ausente: funcionamento normal compatível com contas antigas.
- `deleting`: novas operações bloqueadas; limpeza durável em andamento.
- `retry_required`: bloqueio continua; backend retoma a limpeza, sem exigir que
  a conta já excluída consiga se autenticar novamente.
- `deleted`: limpeza verificada; UID antigo continua bloqueado.

Registrar somente IDs operacionais, estágio, datas e erro categorizado. Definir
retenção do marcador de segurança com revisão jurídica; não apagar o marcador
enquanto sua remoção permitir recriação por trabalho antigo.

## Implementação coordenada

1. Inventariar todas as escritas Admin SDK e cliente, inclusive tarefas, logs
   vinculados ao UID, denúncias, metadados, snapshots e futuras tentativas Apply.
2. Criar marcador e operação idempotente de exclusão em transação. Manter a
   confirmação destrutiva e autenticação recente na solicitação inicial.
3. Regras Firestore e Storage consultam a barreira e negam novas gravações do
   UID bloqueado. Impedir que o cliente edite/remova a própria barreira.
4. Toda persistência de backend ligada ao UID deve verificar a barreira na
   **mesma transação** da escrita. Uma leitura no início da callable não basta.
5. Operações de duração longa usam registro/lease com prazo, cancelamento e
   fence de versão. Worker atrasado não grava depois de perder a autorização.
6. Tratar Storage separadamente: uploads abertos, URLs de sessão resumível,
   snapshots e arquivos órfãos não pertencem à transação Firestore. Bloquear
   novos uploads; verificar comportamento do upload iniciado antes da barreira;
   incluir limpeza idempotente de objetos finalizados tardiamente e varredura
   durável. Não anunciar conclusão antes de comprovar essa garantia.
7. Desabilitar/revogar acesso conforme o ciclo; a continuidade da limpeza não
   pode depender do token do candidato. Nunca remover Auth cedo e perder o retry.
8. Limpar perfil, subcoleções, arquivos, cotas e referências globais em páginas;
   persistir progresso; verificar restos e operações em curso antes de concluir.
9. Resposta/UI distingue solicitação aceita de exclusão concluída. Só usar
   `{ deleted: true }` para conclusão verificável. Limpar sessão/caches locais e
   nunca exibir dados da conta anterior durante o processo.
10. Implantar em staging com compatibilidade planejada entre clientes antigos,
    Rules, Functions e rotinas de limpeza. Feature gate impede dados reais até
    validar o conjunto; nenhuma implantação foi feita nesta revisão.

## Testes de aceitação

- IA termina depois da barreira: não recria cota ou auditoria pessoal.
- Aprovação, rejeição, fila, sessão e denúncia concorrentes: nenhum documento
  pessoal pode reaparecer após conclusão.
- Cliente com token anterior, dois dispositivos e request duplicado: continuam bloqueados.
- Upload já iniciado/resumível termina tarde: arquivo não permanece acessível
  nem retido após o estado de conclusão; testar com SDK/REST em staging.
- Falha em cada etapa de Storage/Firestore/Auth: status honesto e retry pelo servidor.
- Workers duplicados, lease expirada e retomada após reinício: operação idempotente.
- Outra conta não consulta, muda ou dispara exclusão para esse UID.
- Marcador não revela identidade ou dados pessoais a clientes.
- Varredura posterior à conclusão não encontra dados nos caminhos e referências inventariados.

Passar os testes em memória não resolve o comportamento de uploads em curso.
A validação em staging com arquivos sintéticos é obrigatória.

## Remendos rejeitados

Não basta trocar a ordem de `deleteUser`, verificar se `users/{uid}` existe,
limpar duas vezes ou suprimir só `aiEvents`. Esses caminhos deixam janelas de
corrida ou outras fontes capazes de recriar dados.
# Atualização de implementação — 16/09/2026

Foi implementada a base local: tombstone `accountLifecycle`, bloqueio de escrita no backend e nas regras, desabilitação/revogação de Auth, limpeza recuperável e sweeper. A validação de uma sessão resumível de Storage criada antes da exclusão continua pendente em ambiente de teste; por isso a confirmação final da exclusão exige `STORAGE_DELETION_FENCE_VERIFIED=true`, que permanece desligado. Veja `PILOT-IOS-LAUNCH-CHECKLIST.md`.
