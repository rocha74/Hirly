# Hirly Apply — fundação de dados

Data da decisão: 2026-07-31.

## Escopo

Esta etapa define contratos, validação, compatibilidade e segurança para o
Hirly Apply. Ela não cria telas, geração de IA, aprovação ou envio automático.

## Separação de responsabilidades

- `CandidateJobPreferences` é editável pelo candidato e complementa o
  `UserProfile`; não duplica nem migra destrutivamente o perfil atual.
- `ApplicationPackage` é o agregado de domínio. Para evitar reescrever um
  documento grande a cada edição, respostas são persistidas em
  `applicationPackages/{packageId}/answers/{answerId}`. O documento do pacote
  guarda apenas `answerIds`.
- `ApplicationQueueItem` é uma projeção para consulta e ordenação. O pacote é a
  fonte autoritativa do estado e a fila não deve ser alterada isoladamente.
- `ExternalApplicationSession` registra assistência e confirmação. Aprovação de
  pacote não equivale a envio, e uma sessão só pode terminar como concluída com
  confirmação explícita `submitted`.

## Paths

```text
users/{uid}/applyPreferences/current
users/{uid}/applicationPackages/{packageId}
users/{uid}/applicationPackages/{packageId}/answers/{answerId}
users/{uid}/applicationQueue/{queueItemId}
users/{uid}/externalApplicationSessions/{sessionId}
users/{uid}/applyOperations/{operationId}
users/{uid}/providerApplicationForms/{formId}
users/{uid}/applicationConsents/{consentId}
users/{uid}/applicationSubmissionAttempts/{attemptId}
users/{uid}/applicationSubmissionProjections/{attemptId}
```

Todos os dados profissionais e de candidatura permanecem sob `users/{uid}` e
continuam cobertos pela exclusão recursiva de conta.

## Autoridade e Rules

| Coleção | Leitura cliente | Escrita cliente | Escrita backend |
| --- | --- | --- | --- |
| `applyPreferences` | proprietário | proprietário, validada | sim |
| `applicationPackages` e respostas | proprietário | não | sim |
| `applicationQueue` | proprietário | não | sim |
| `externalApplicationSessions` | proprietário | não | sim |
| `applyOperations` | proprietário | não | sim |
| `providerApplicationForms` | não | não | sim |
| `applicationConsents` | não | não | sim |
| `applicationSubmissionAttempts` | não | não | sim |
| `applicationSubmissionProjections` | proprietário | não | sim |

O wildcard anterior `users/{uid}/{document=**}` foi substituído por uma lista
explícita de subcoleções legadas. Em Firestore, permissões são aditivas; manter o
wildcard faria qualquer bloqueio mais específico ser ineficaz.

Preferências novas exigem:

- `candidateId` igual ao UID do path;
- schema atual;
- campos conhecidos;
- limites de listas e números;
- timestamps de criação/alteração gerados pelo servidor.

Validações mais ricas, como conteúdo de objetos aninhados e conflito entre
empresas preferidas e bloqueadas, são aplicadas pelo validador TypeScript. As
operações autoritativas futuras devem repetir os invariantes no backend.

## Proveniência e confiança

Textos e respostas carregam fontes estruturadas. `generated: true` identifica o
método de produção, mas não substitui a origem factual. Conteúdo sem fonte não é
válido. Respostas aprovadas precisam estar revisadas; conteúdos de baixa
confiança não podem ser marcados como aprovados.

Não devem ser enviados a logs ou analytics:

- texto de respostas;
- conteúdo de currículo;
- fontes com trechos pessoais;
- campos sensíveis;
- URLs que contenham tokens ou credenciais.

## Compatibilidade

- `mapUserProfileToCandidateJobPreferences` cria uma visão inicial a partir do
  perfil, sem escrever ou remover campos legados.
- `mapLegacyApplicationPlanToPackage` sempre converte a checklist antiga em
  `package_needs_information`; passos concluídos não são tratados como materiais
  gerados ou aprovados.
- `mapPendingConfirmationToExternalSession` converte o lembrete local atual em
  `awaiting_confirmation`, sem presumir envio.
- `toStoredApplicationPackage` e `hydrateStoredApplicationPackage` separam e
  recompõem respostas mantendo sua ordem explícita.
- `mapLegacyExternalSessionToSubmissionAttempt` preserva uma sessão antiga como
  `manual_assist` sem inventar consentimento, formulário, payload ou protocolo.

Os contratos automáticos e suas invariantes estão detalhados em
`HIRLY-APPLY-AUTOMATIC-FOUNDATION.md`.

## Índices

Foram definidos índices compostos para:

- pacotes por `status` e `updatedAt`;
- fila por `status`, `priorityRank` e `expiresAt`;
- sessões externas por `status` e `startedAt`.
- tentativas e projeções automáticas por `state` e `updatedAt`.

Os índices precisam ser implantados e concluídos no projeto Firebase correto
antes de ativar consultas que dependam deles.

## Pendências para as próximas etapas

- Implementar callables/worker que repitam a validação e controlem transições.
- Criar estado persistente de operações longas e idempotency keys.
- Definir política de aprovação individual e em lote.
- Implementar memória profissional estruturada e versões de currículo.
- Migrar alterações do tracker legado para backend antes de restringir escrita
  cliente em `applications`.
- Executar Rules no Emulator Suite com Java 21 e depois validar em duas contas
  de teste no projeto correto.
