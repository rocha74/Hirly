# Hirly AI Backend

`callAiFeature` aceita somente `feature`, `payload` validado e `schemaVersion`.
Modelo, prompts, tools, temperatura, tokens e endpoint pertencem ao backend.

## Configuracao manual

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
```

Os parametros nao secretos ficam em `functions/.env.<project-id>`:

```dotenv
AI_ENABLED_FEATURES=cv_parse,job_summary,match_explanation,cv_coach
```

O segredo deve ser novo, exclusivo do backend e nunca pode usar prefixo
`EXPO_PUBLIC_`. `AI_ENABLED_FEATURES` permite desligar features sem alterar o
cliente. Para desligar tudo, implante com a lista vazia.

## Testes

```bash
cd functions && npm ci && cd ..
npm run test:functions
```

## Deploy seguro

Revise primeiro `.firebaserc` e o projeto selecionado. Depois:

```bash
firebase deploy --only functions:callAiFeature,functions:deleteMyAccount,functions:reportJob,functions:resolveJobLink,functions:expireJobs
firebase functions:delete anthropicProxy --region us-central1
```

O segundo comando remove a callable antiga que aceitava bodies arbitrarios.
Nao mantenha as duas em producao. Nenhum desses comandos foi executado nesta
tarefa.

`reportJob` centraliza denuncias e contadores idempotentes. `expireJobs` usa
Cloud Scheduler a cada seis horas; confirme faturamento e a API do Scheduler no
projeto antes do deploy. O fluxo completo esta em `docs/JOBS-PIPELINE.md`.

`resolveJobLink` exige Authentication e informa somente se a vaga existe, esta
disponivel ou foi encerrada. Conteudo de drafts e vagas inativas nao e enviado
ao cliente.

## App Check

O backend mantém `enforceAppCheck` e consumo de token como `false` no código do
piloto. Nao altere para `true` antes de atualizar `firebase-functions`, concluir o checklist em
`docs/APP-CHECK-MANUAL-SETUP.md`, gerar novos development builds e validar os
tokens de producao.
