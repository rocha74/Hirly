# Beta Metrics

Taxonomia de produto e observabilidade do beta do Hirly. PostHog recebe somente
eventos permitidos pela interface interna em `src/utils/analytics.ts`; Sentry
recebe erros sanitizados por `src/services/monitoring.ts`.

## Privacidade

- A identidade e somente o UID pseudonimo do Firebase Authentication.
- Nome, e-mail, telefone, curriculo, texto do CV, prompts e respostas de IA nao
  podem ser propriedades de analytics ou contexto de monitoramento.
- As propriedades de evento passam por allowlist. Chaves desconhecidas sao
  descartadas e strings permitidas sao limitadas a 120 caracteres.
- O texto opcional do feedback fica apenas no Firestore, e-mail e telefone sao
  removidos no cliente, e o texto nao entra em PostHog ou Sentry.
- Autocapture de toques, GeoIP e session replay estao desativados. Replay deve
  continuar desligado no beta.
- O logout e a exclusao de conta executam `reset`, separando a identidade da
  proxima sessao.

## Propriedades comuns

Todos os eventos incluem `sessionId`, `appVersion` e `platform`. Quando fizer
sentido, podem incluir `jobId`, `areaId`, `workMode`, `contractType`,
`matchBucket`, etapa, categoria ou duracao. Nenhum texto livre e aceito.

## Eventos

### Auth

| Evento | Definicao |
| --- | --- |
| `signup_started` | Tentativa valida de criacao de conta iniciada. |
| `signup_completed` | Conta e perfil inicial criados. |
| `login_completed` | Login concluido. |
| `logout` | Saida solicitada pelo candidato. |
| `account_deletion_started` | Exclusao autenticada iniciada. |
| `account_deletion_completed` | Callable terminou e limpeza local foi iniciada. |
| `account_deletion_failed` | Reautenticacao ou callable falhou, com categoria segura. |

### Onboarding e CV

| Evento | Definicao |
| --- | --- |
| `onboarding_started` | Primeira etapa obrigatoria aberta. |
| `onboarding_step_completed` | Etapa obrigatoria salva; inclui `step`. |
| `onboarding_abandoned` | Etapa desmontada sem conclusao. |
| `onboarding_completed` | Preferencias minimas salvas e feed liberado. |
| `cv_upload_started` | PDF valido selecionado e upload iniciado. |
| `cv_upload_completed` | Upload e metadata concluidos. |
| `cv_parse_completed` | Parsing do CV concluido sem enviar conteudo ao analytics. |
| `cv_parse_failed` | Parsing falhou. |
| `cv_skipped` | Onboarding concluido sem CV. |

### Feed e vaga

| Evento | Definicao |
| --- | --- |
| `feed_opened` | Feed montado. |
| `jobs_loaded` | Um lote utilizavel chegou; inclui quantidade total em memoria. |
| `jobs_load_failed` | Carga inicial ou paginacao falhou. |
| `job_impression` | Vaga ficou pelo menos 1,2 s com 80% de visibilidade. |
| `job_passed` | Pass persistido. |
| `job_liked` / `job_unliked` | Curtida adicionada ou removida. |
| `undo_used` | Ultimo pass desfeito no banco. |
| `feed_exhausted` | Feed sem vagas acionaveis e sem mais paginas. |
| `filters_opened` / `filters_applied` | Abertura e aplicacao dos filtros. |
| `job_detail_opened` | Detalhe aberto, com dimensoes canonicas da vaga. |
| `apply_clicked` | CTA externo acionado. |
| `apply_link_opened` / `apply_link_failed` | Link abriu ou falhou antes da confirmacao. |
| `application_confirmed` | Candidato confirmou manualmente a candidatura. |
| `job_shared` | Compartilhamento nativo concluido. |
| `job_reported` | Backend aceitou a denuncia. |

### IA e feedback

| Evento | Definicao |
| --- | --- |
| `ai_feature_started` | Feature tipada iniciada. |
| `ai_feature_completed` | Resposta validada, com duracao. |
| `ai_feature_failed` | Erro seguro diferente de quota. |
| `ai_quota_reached` | Backend informou limite atingido. |
| `feedback_prompt_shown` | Pergunta contextual exibida apos acoes reais. |
| `feedback_submitted` | Feedback salvo; somente nota, categoria e origem no evento. |
| `feedback_dismissed` | Pergunta contextual dispensada. |

Eventos auxiliares preservados: `application_confirmation_shown`,
`application_not_completed`, `application_status_changed` e
`cv_uploaded_later`.

## Funil principal

1. `signup_started` -> `signup_completed`.
2. `onboarding_started` -> etapas -> `onboarding_completed`.
3. `feed_opened` -> `jobs_loaded` -> `job_impression`.
4. `job_liked` -> `job_detail_opened` -> `apply_link_opened`.
5. `application_confirmed`.

## Indicadores

- Retencao D1 e D7: UID com `feed_opened` no dia 1 ou 7 apos o primeiro uso.
- Conversao: usuarios com `application_confirmed` / usuarios com `feed_opened`.
- Vagas por sessao: `job_impression` distintos por `sessionId`.
- Tempo ate primeira candidatura: primeiro `application_confirmed` menos
  `signup_completed`.
- Custo de IA por usuario: calculado no backend com `aiEvents`, nunca pelo
  conteudo do prompt no PostHog.
- Crash-free sessions: sessoes sem erro fatal no Sentry / sessoes monitoradas.

## Hipoteses iniciais

Estas metas sao hipoteses para calibracao, nao garantias de produto:

- conclusao do onboarding >= 65%;
- pelo menos 8 impressoes de vaga por sessao mediana;
- candidatura confirmada em >= 12% dos usuarios ativos semanais;
- retencao D1 >= 25% e D7 >= 10%;
- crash-free sessions >= 99%;
- custo mediano de IA por usuario ativo dentro do orcamento definido pelo dono.

## Verificacao manual

1. Em desenvolvimento, confirmar no console `[analytics]` apenas propriedades
   permitidas.
2. Com variaveis do ambiente de desenvolvimento, confirmar eventos no Live
   Events do PostHog e um erro de teste no projeto Sentry.
3. Validar que o usuario no PostHog/Sentry possui apenas UID, sem e-mail/nome.
4. Fazer logout, entrar com outra conta e confirmar distinct IDs separados.
5. Em build EAS de teste, confirmar release, ambiente, tela e source map no
   Sentry antes de distribuir o beta.
