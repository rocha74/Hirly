# Pipeline de qualidade das vagas

## Contrato

O schema `2026-07-11` vive em `functions/shared/jobPipeline.js` e e usado pelo
app, scripts e Functions. Campos guardam estado `not_provided`, `empty`,
`invalid`, `inferred` ou `confirmed`. Uma vaga so pode ficar `live` e ativa se:

- todos os campos obrigatorios forem validos;
- `verificationStatus` for `verified`;
- `curationStatus` for `approved`;
- `reviewedAt`, `reviewedBy` e `lastVerifiedAt` existirem;
- prazos nao estiverem vencidos.

Editar conteudo invalida a revisao anterior, pausa a vaga e a devolve para
`draft`. O feed tambem bloqueia localmente vagas sem verificacao nos ultimos 14
dias, mesmo se a rotina agendada ainda nao estiver implantada.

## Auditoria local

```bash
npm run jobs:audit
npm run jobs:audit -- data/lote.json data/lote.csv
```

As saidas ficam em `reports/jobs-audit.json` e `reports/jobs-audit.csv`. O
diretorio e ignorado pelo Git porque lotes reais podem conter informacoes
operacionais. A auditoria nao consulta nem inclui dados de candidatos.

No modo padrao, quando existem `lote.json` e `lote.csv` com o mesmo nome-base, o
JSON e auditado e o CSV e tratado como espelho. Para comparar os dois arquivos,
informe ambos explicitamente na linha de comando.

## Importacao

```bash
node scripts/importVagas.js data/lote.json --dry-run
node scripts/importVagas.js data/lote.json
```

O importador usa Application Default Credentials configuradas fora do
repositorio. `sourceUrl` normalizada gera ID estavel; na falta dela, `applyUrl`
e usada, e por ultimo uma chave composta. Importacao repetida e idempotente.
Conteudo alterado volta para `draft`, `needs_review` e inativo. As opcoes
destrutivas `--replace` e `--force-live` foram removidas.

## Expiracao e denuncias

`expireJobs` roda a cada seis horas, expira prazos vencidos e pausa vagas sem
verificacao recente. `reportJob` usa o UID autenticado, aceita uma denuncia por
usuario/vaga e pausa automaticamente apos tres denunciantes distintos.

## Deploy manual

Confirme o projeto alvo e repita todos os testes antes de executar:

```bash
firebase deploy --only functions:reportJob
firebase deploy --only firestore:rules
firebase deploy --only functions:expireJobs
```

Implante nessa ordem para o app nunca ficar sem canal de denuncia. `expireJobs`
usa Cloud Scheduler e pode exigir projeto com faturamento ativo e API do Cloud
Scheduler habilitada. Nenhum deploy ou ativacao de plano foi feito nesta tarefa.
