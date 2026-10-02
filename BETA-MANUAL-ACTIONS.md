# Beta Manual Actions

Indice cumulativo das acoes que dependem do proprietario, consoles externos ou
revisao profissional. Na Tarefa 12, todos os itens destes documentos devem ser
reapresentados ao proprietario como checklist final:

- `docs/SECURITY-MANUAL-ACTIONS.md`: revogacao de credenciais, consoles,
  App Check, regras e deploys.
- `docs/LEGAL-MANUAL-REVIEW.md`: identificacao juridica, LGPD, contatos,
  retencao, operadores, publicacao e revisao profissional.
- `docs/BETA-ROADMAP.md`: itens marcados como bloqueados por acao manual.

## Acoes adicionadas na Tarefa 3

- Aprovar profissionalmente Termos `2026-07-10` e Politica `2026-08-03`.
- Preencher todos os marcadores `[PREENCHIMENTO MANUAL OBRIGATORIO]`.
- Publicar URLs HTTPS oficiais e separadas para Termos e Privacidade.
- Criar e testar canais oficiais de suporte, privacidade e takedown.
- Definir idade minima, bases legais, retencao, transferencias, foro e processo
  de atendimento aos direitos do titular.
- Ao executar o importador administrativo, configurar Application Default
  Credentials fora do repositorio e confirmar explicitamente o projeto alvo.
- Planejar a migração que remova os 17 achados moderados e 10 altos da árvore
  de produção do app e os 9 moderados das Functions. Não usar `npm audit
  fix --force`: hoje ele força Expo 57 e Firebase Admin 13.

## Lembrete da Tarefa 12

- Nao encerrar a Tarefa 12 sem apresentar ao proprietario uma lista consolidada
  e atualizada de todas as acoes manuais acumuladas nas Tarefas 1 a 12.

## Acoes adicionadas na Tarefa 4

- Configurar o segredo novo `ANTHROPIC_API_KEY` somente no Secret Manager.
- Configurar `AI_ENABLED_FEATURES` no ambiente das Functions.
- Implantar `callAiFeature` e remover a callable legada `anthropicProxy`; nao
  deixar o endpoint antigo ativo.
- Executar todo o checklist `docs/APP-CHECK-MANUAL-SETUP.md`, gerar novos
  binarios nativos e somente depois ativar `AI_ENFORCE_APP_CHECK=true` e
  `APPLY_ENFORCE_APP_CHECK=true`.
- Definir retencao operacional de `aiEvents` e monitorar quotas/custos reais.

## Acoes adicionadas na Tarefa 5

- Confirmar o projeto Firebase alvo e implantar o indice versionado com
  `firebase deploy --only firestore:indexes`.
- Aguardar o indice `jobs: isActive ASC, createdAt DESC` ficar pronto no
  Firestore antes de liberar o feed para candidatos beta.
- Auditar vagas ativas legadas sem `status`; preencher `status: live` somente
  por script administrativo revisado, sem apagar ou despublicar dados em massa.
- Validar em dois usuarios beta reais: persistencia de pass/like/candidatura,
  isolamento entre contas, retorno apos logout/login e undo sob perda de rede.

## Acoes adicionadas na Tarefa 6

- Gerar novos builds nativos de iOS e Android por causa da inclusao de
  `expo-clipboard`; nenhum build de loja foi produzido nesta tarefa.
- Em aparelhos reais, testar retorno de Safari e Chrome, as tres respostas do
  prompt, app encerrado com lembrete pendente e duas aberturas da mesma vaga.
- Testar links invalidos/quebrados, permissao de clipboard e envio da denuncia
  para a fila de moderacao do projeto Firebase correto.
- Confirmar na futura ferramenta de analytics a chegada dos sete eventos do
  ciclo de candidatura sem payload de dados pessoais.

## Acoes adicionadas na Tarefa 7

- Testar em aparelhos reais um cadastro novo sem CV ate o feed e a navegacao de
  volta entre Consentimento, Objetivo, Area e Preferencias.
- Testar perfis legados sem `onboardingCompleted: true`; eles devem retomar a
  primeira etapa minima ausente sem perder dados existentes.
- Validar o fluxo opcional de CV depois do feed: upload, IA, revisao, exclusao e
  retorno ao banner de completude.
- Revisar a cobertura da lista brasileira de cidades e decidir se o beta precisa
  de entrada manual para municipios ausentes.
- Confirmar na futura ferramenta de analytics os eventos de inicio, conclusao,
  abandono, `cv_skipped` e `cv_uploaded_later` sem dados pessoais.

## Acoes adicionadas na Tarefa 8

- Fazer QA visual em iOS e Android dos estados de confianca alta, media e baixa,
  incluindo score aproximado, textos longos e perfil quase vazio.
- Validar com uma amostra real de vagas os aliases iniciais de area e skills;
  ampliar a taxonomia somente com exemplos revisados para evitar falsos matches.
- Monitorar documentos novos de perfil e vaga para confirmar a gravacao dos IDs
  canonicos junto dos campos legados antes de planejar qualquer backfill.
- Revisar com produto se disponibilidade para mudanca deve valer compatibilidade
  parcial de localizacao; hoje o ajuste deterministico e de 50% nessa dimensao.

## Acoes adicionadas na Tarefa 9

- Revisar `reports/jobs-audit.json`/CSV e corrigir os lotes antes de importar;
  o baseline atual tem 151 entradas e 870 problemas acionaveis.
- Auditar e reverificar as vagas existentes no Firestore. Vagas sem
  `verificationStatus: verified`, aprovacao e verificacao recente nao aparecem
  mais no feed por decisao de seguranca.
- Confirmar o projeto Firebase e implantar manualmente as novas Firestore Rules,
  `reportJob` e `expireJobs`, na ordem descrita em `docs/JOBS-PIPELINE.md`.
- Confirmar faturamento e habilitar Cloud Scheduler antes do deploy de
  `expireJobs`; verificar no Console a execucao a cada seis horas e alertas.
- Testar no projeto real tres denunciantes distintos, retry da mesma denuncia,
  auto-pausa, expiracao por ambos os campos e reverificacao pelo painel admin.
- Validar permissao e identidade dos documentos `admins/{uid}` usados para
  revisar/publicar vagas; nenhuma conta administrativa foi criada nesta tarefa.

## Acoes adicionadas na Tarefa 10

- Executar integralmente `docs/ANALYTICS-MANUAL-SETUP.md` nos projetos de
  desenvolvimento antes de configurar producao.
- Criar projetos PostHog e Sentry, definir regiao, acesso, retencao e ambientes.
- Configurar no EAS os identificadores publicos do PostHog/Sentry e manter
  `SENTRY_AUTH_TOKEN` somente como variavel `sensitive`, sem prefixo publico.
- Gerar novos development/preview builds devido aos modulos nativos do Sentry.
- Confirmar eventos no Live Events do PostHog e um erro simbolicado no Sentry,
  verificando que a identidade contem somente UID e nao existe PII/CV/prompt.
- Implantar as Firestore Rules de feedback no projeto confirmado e testar
  criacao pelo candidato e leitura apenas administrativa.
- Configurar dashboards e alertas de `docs/BETA-METRICS.md`; revisar as metas
  iniciais como hipoteses depois de uma amostra beta real.
- Manter autocapture de toques, GeoIP e session replay desativados durante o
  beta, salvo nova revisao explicita de privacidade.

## Acoes adicionadas na Tarefa 11

- Executar `docs/DEEP-LINK-MANUAL-SETUP.md`: obter Apple Team ID e fingerprints
  Android reais, preencher os templates e hospeda-los nos dois dominios sem
  redirects e com `Content-Type: application/json`.
- Confirmar capabilities do App ID, App Links, Play App Signing e reinstalar os
  builds ao alterar associacoes de dominio.
- Implantar `resolveJobLink` no projeto Firebase confirmado e testar vaga ativa,
  inexistente, pausada e expirada com um usuario autenticado.
- Fazer `eas login`, `eas init`, `eas build:configure` e
  `eas build:version:set` na conta correta; a validacao local do EAS CLI ficou
  bloqueada por ausencia de login e nenhum project ID foi inventado.
- Configurar ambientes EAS e credenciais conforme `docs/EAS-BETA-SETUP.md`,
  gerar development e preview builds e testar deep links em aparelhos reais.
- Revisar os novos icones, adaptive icon e splash em iOS/Android reais e nas
  telas de loja antes da submissao.
- Decidir explicitamente se EAS Update sera adotado. Ate essa decisao, nao
  configurar canais nem publicar updates.
- Autorizar separadamente qualquer envio ao TestFlight ou Google Play Closed
  Testing; nenhum build ou submit externo foi executado nesta tarefa.

## Acoes adicionadas na Tarefa 12

- Executar o checklist consolidado `docs/BETA-FINAL-MANUAL-ACTIONS.md`.
- Rodar o workflow `Beta check` em pull request e guardar a execucao verde.
- Gerar preview assinado e executar `docs/BETA-MANUAL-TEST-PLAN.md` em iOS e
  Android fisicos, incluindo acessibilidade, performance e rollback.
- Triar os avisos do ESLint e vulnerabilidades moderadas documentadas sem aplicar
  upgrades quebradores sem nova verificacao completa.
- Nao liberar o beta enquanto os bloqueadores de
  `docs/BETA-RELEASE-CHECKLIST.md` permanecerem abertos.
