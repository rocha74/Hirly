# Hirly Apply — fila de revisão e aprovação em lote

## Objetivo

A central projeta cada `ApplicationPackage` em um `ApplicationQueueItem` persistido. O cartão continua legível mesmo se a vaga sair do feed e contém apenas os dados necessários para uma decisão rápida: snapshot da vaga, compatibilidade, motivo, risco, currículo, respostas, pendências, estimativa e validade.

Aprovar um pacote registra consentimento sobre o conteúdo preparado. **Não cria uma candidatura em `applications` e não significa envio externo.** A conclusão externa continua sendo uma etapa separada.

## Estados

- `prepared` e `needs_information`: pacote preparado, ainda sem aprovação.
- `deferred`: candidato escolheu deixar para depois; a decisão fica no Firestore.
- `approved`: conteúdo aprovado, mas ainda não enviado.
- `external_pending` e `external_in_progress`: aguardando ou executando conclusão em site externo.
- `submitted`: envio confirmado pelo candidato.
- `failed`, `expired` e `rejected`: estados terminais ou removidos da central ativa.

Uma alteração ou regeneração incrementa `ApplicationPackage.revision`, zera a aprovação anterior e reprojeta a fila. `ApplicationQueueItem.packageRevision` evita aprovar em lote uma versão diferente da exibida.

## Política de aprovação em lote

A função pura `bulkApprovalBlockers` é a autoridade para elegibilidade. Ela bloqueia:

- item expirado ou em estado incompatível;
- conteúdo ou resposta com confiança baixa;
- pretensão salarial, disponibilidade ou pergunta legal sem confirmação explícita;
- pendência, alerta, requisito eliminatório ou risco bloqueante;
- divergência entre a revisão do pacote e a revisão exibida na fila.

Respostas sensíveis só deixam de bloquear quando foram informadas pelo candidato (`generated: false`), revisadas e aprovadas. Uma resposta sensível anterior pode ser reutilizada pela camada de proveniência, com fonte `approved_answer`; ela nunca é inferida a partir da vaga.

## Consistência, offline e duplicidade

- Seleção múltipla é estado local e não altera dados.
- “Deixar para depois” usa atualização otimista com rollback em erro.
- Aprovação, recusa e lote aguardam confirmação do backend antes de alterar a interface.
- Falha de carregamento mantém a última fila válida; o serviço tenta o cache local do Firestore.
- Ações mutáveis recebem `actionId`. O backend persiste o resultado em `applyOperations` e retorna o mesmo resultado em uma repetição.
- Remover em lote é uma recusa lógica (`rejected`/`bulk_removed`), nunca exclusão destrutiva.

## Segurança e privacidade

As coleções `applicationQueue`, `applicationPackages`, `approvedAnswers` e `applyOperations` permanecem sob `users/{uid}`. As regras permitem somente leitura do próprio candidato; mutações são feitas por Cloud Functions autenticadas com o UID do token. Nenhuma propriedade textual de currículo, resposta ou risco é enviada ao analytics.

## Analytics

Eventos implementados:

- `queue_viewed`
- `queue_item_opened`
- `queue_item_approved`
- `queue_item_rejected`
- `queue_bulk_selected`
- `queue_bulk_approved`
- `queue_item_deferred`

Somente IDs técnicos, contagens, estado e origem de cache passam pelo sanitizador existente.

## Cobertura de testes

Há testes para aprovação em lote, pendência sensível, expiração, alteração após aprovação, falha de sincronização, leitura offline/cache, rollback otimista e duplicidade de ação. As regras já cobrem isolamento entre usuários para `applicationQueue`; o emulador exige Java no ambiente local.
