# Hirly Apply — contrato de analytics e validação do MVP

Versão do contrato: `1`. A fonte executável é `src/features/apply/analytics/contract.ts`; toda emissão do Apply passa por `trackApplyEvent`, que inclui `analyticsSchemaVersion` e pela lista de propriedades permitidas em `analyticsPrivacy.ts`.

## Princípios de privacidade

- O identificador de usuário existe apenas como identidade pseudônima no provedor; não é enviado como propriedade de evento.
- Não coletamos nome, e-mail, telefone, currículo, pergunta, resposta, prompt, carta, pitch, empresa ou URL externa.
- Edições e cópias usam somente categorias: `motivation`, `requirement_confirmation`, `salary_expectation`, `availability`, `legal` ou `other`.
- Motivos de recusa e falha são códigos categóricos, nunca texto livre.
- Replay de sessão e geolocalização estão desabilitados na configuração do PostHog.

## Eventos

| Evento | Quando ocorre | Propriedades principais | Métrica |
|---|---|---|---|
| `recommendation_generated` | Vaga entra na seleção diária | `jobId`, `recommendationRank`, `matchScore`, `estimatedMinutes` | base e esforço manual estimado |
| `recommendation_viewed` | cartão fica visível | `jobId`, `matchBucket` | impressão |
| `recommendation_opened` | detalhes da recomendação são abertos | `jobId`, `recommendationRank` | taxa de abertura |
| `recommendation_saved` | vaga é salva | `jobId` | interesse |
| `recommendation_rejected` | recomendação é recusada | `jobId`, `reason` | recusas por motivo |
| `recommendation_package_started` | usuário pede preparação | `jobId` | intenção de conversão |
| `package_generation_started` | preparação começa | `jobId` | tentativas |
| `package_generation_completed` | pacote fica disponível | `jobId`, `durationMs`, `reusedAnswerCount`, `pendingCount` | sucesso, tempo e reuso |
| `package_generation_failed` | preparação falha | `jobId`, `durationMs`, `failureStage` | erros |
| `package_answer_edited` | resposta é editada/completada | `jobId`, `answerCategory`, `packageRevision` | esforço e qualidade da IA |
| `package_risk_confirmed` | risco é conferido | `jobId`, `packageRevision` | esforço de revisão |
| `package_section_regenerated` | seção é regenerada | `jobId`, `section` | retrabalho |
| `package_approved` | revisão é aprovada | `jobId`, `durationMs`, `isBulk` | aprovação e tempo de revisão |
| `package_rejected` | pacote é recusado | `jobId`, `reason` | abandono antes do externo |
| `queue_viewed` | central é aberta | `resultCount`, `cacheSource` | retorno à fila |
| `queue_item_opened` | item da fila é aberto | `jobId`, `status` | revisão individual |
| `queue_item_approved` | item é aprovado na fila | `jobId`, `durationMs` | origem da aprovação |
| `queue_item_rejected` | item é removido | `jobId`, `reason` | recusas após preparação |
| `queue_bulk_selected` | seleção do lote muda | `resultCount` | uso do lote |
| `queue_bulk_approved` | lote termina | `resultCount`, `durationMs` | aprovações em lote |
| `queue_item_deferred` | item fica para depois | `jobId` | adiamento |
| `external_session_started` | sessão assistida é criada/retomada | `jobId`, `cached`, `status` | base externa |
| `external_answer_copied` | resposta é copiada | `jobId`, `answerCategory` | uso dos materiais |
| `external_resume_opened` | currículo é aberto | nenhuma obrigatória | uso do currículo |
| `external_application_confirmed` | usuário confirma o envio | `jobId`, `durationMs` | conclusão |
| `external_application_abandoned` | usuário informa desistência | `jobId`, `reason`, `durationMs` | abandono explícito |
| `external_application_failed` | impedimento técnico encerra sessão | `jobId`, `reason`, `failureStage` | erro externo |
| `external_failure_reason` | motivo categórico é registrado | `jobId`, `reason` | diagnóstico externo |

`application_status_changed` já existente complementa o contrato: `status=interviewing`, depois de uma confirmação externa da mesma vaga, conta como entrevista informada.

## Definições das métricas

- Taxas do funil usam pares distintos de usuário pseudônimo + vaga, evitando duplicidade por retomada ou múltiplos cliques.
- Abertura = recomendações geradas que tiveram `recommendation_opened`; impressão não é abertura.
- Recomendação → pacote = recomendações geradas que tiveram `package_generation_started`.
- Aprovação = pacotes concluídos que tiveram `package_approved`.
- Conclusão externa = sessões iniciadas que tiveram confirmação explícita.
- Tempo recomendação → candidatura = mediana entre a primeira recomendação e a primeira confirmação da mesma vaga.
- Tempo de revisão = duração ativa enviada na aprovação; o fallback é a diferença entre pacote concluído e aprovado. Valores acima de duas horas são descartados como inativos.
- Economia estimada = `estimatedMinutes - geração - revisão - sessão externa`. Só entram jornadas com as quatro medidas e durações de até duas horas. O valor pode ser negativo e deve ser lido como esforço adicional, não ocultado.
- Edições por pacote contam somente respostas; ranking é por categoria, nunca por conteúdo.
- Taxa de erro = falhas de pacote + falhas externas técnicas / tentativas de pacote + sessões externas. Desistência voluntária é separada.
- Retenção em 7 dias = usuário elegível cuja primeira candidatura tem ao menos sete dias e que produz novo evento entre 24 horas e sete dias depois dela.
- Candidaturas concluídas = confirmações externas distintas por usuário + vaga.
- Entrevistas = mudança posterior para `interviewing` na mesma vaga, informada pelo candidato.

## Relatório simples do MVP

Exporte eventos no formato abaixo, usando um identificador pseudônimo estável. O arquivo deve permanecer em ambiente de acesso restrito.

```json
[
  {
    "event": "recommendation_generated",
    "timestampMs": 1767225600000,
    "userId": "anon-42",
    "properties": { "jobId": "job-123", "estimatedMinutes": 20 }
  }
]
```

Execute:

```bash
npm run apply:metrics -- caminho/para/eventos.json
```

O resultado responde diretamente: tempo estimado economizado, candidaturas concluídas, abandono por etapa, categorias mais editadas, recusas por motivo e retorno em sete dias; também inclui o funil completo e seus denominadores.

## Limitações para interpretar o MVP

- `estimatedMinutes` é uma referência determinística por vaga, não um cronômetro do comportamento anterior do candidato.
- A duração externa é tempo decorrido da sessão; jornadas retomadas depois de longas pausas são excluídas da economia.
- Entrevistas dependem da atualização de status pelo candidato.
- Percentuais com denominador zero retornam `0`; sempre exibir o denominador junto da taxa.
- Avaliações devem segmentar por `analyticsSchemaVersion` para não misturar o contrato novo com eventos legados.
