# Architecture Current

Revisão local: 2026-09-09. Este documento descreve o
codigo local; nao confirma deploys nem configuracoes de console.

## Entrada e navegacao

- `index.ts` registra `App.tsx` pelo Expo.
- `App.tsx` carrega fontes e splash, instala os providers de gestos e safe area
  e monta `AuthProvider` e `ApplicationFlowProvider` acima do `AppNavigator`.
- O `AuthProvider` possui o unico `onAuthStateChanged` do app e um listener do
  perfil `users/{uid}`. Ele centraliza usuario, perfil, carregamentos,
  verificacao de e-mail, logout, refresh, consentimento e estado de onboarding.
- `AppNavigator` escolhe Auth, Onboarding ou Main pelo `onboardingState` do
  contexto. Consentimento atual e onboarding concluido sao condicoes distintas.
  O `NavigationContainer` integra `expo-linking` com scheme próprio por ambiente;
  somente produção registra os dois hosts HTTPS públicos. Links guardam apenas `jobId`; se login/onboarding estiver
  pendente, o destino expira em 24 horas e e retomado depois da conclusao.
- Auth contem boas-vindas, cadastro, login e recuperacao de senha. O onboarding
  possui Consentimento, Objetivo, Áreas e Preferências, seguidos de convite
  opcional ao CV, revisão da extração e introdução ao match. Competências podem
  ser informadas manualmente. Termos e Privacidade são telas internas acessíveis
  antes do checkbox, sem obrigar abertura para desbloquear o aceite. Main e uma
  stack com feed, detalhe, perfil, curtidas, candidaturas, recursos de IA e
  telas administrativas.

## Firebase

- `src/services/firebase.ts` inicializa o Firebase Web SDK. Desenvolvimento usa
  a configuração pública local; staging e produção exigem `EXPO_PUBLIC_FIREBASE_*`
  completas e rejeitam o projeto de desenvolvimento. Auth persiste sessão com
  AsyncStorage. `app.config.js` também separa nome, scheme e IDs nativos.
- Firestore guarda perfis e subcolecoes privadas em `users/{uid}`, vagas em
  `jobs`, administradores em `admins` e denuncias em `reports`.
- As regras locais exigem autenticacao, isolam `users/{uid}` pelo dono e
  restringem escrita de vagas a UIDs presentes em `admins`.
- Storage guarda uploads novos em `users/{uid}/cv/{uploadId}.pdf` e preserva
  leitura/exclusao de `users/{uid}/cv.pdf` para legados. O arquivo anterior so e
  removido depois que a nova metadata foi confirmada; o perfil guarda caminho,
  nome, tamanho, data e content type, sem URL de download com token.
- Functions usa a regiao `us-central1`. `callAiFeature` atende IA e
  `deleteMyAccount` remove dados recursivos, arquivos, registros globais e Auth
  ao final, sempre usando o UID do token autenticado. `resolveJobLink` diferencia
  vaga disponivel, inexistente e encerrada sem liberar conteudo de drafts.

## Fluxos do produto

- Curriculo: é oferecido no onboarding, mas o arquivo e a análise são opcionais.
  Depois da entrada, `ImproveProfile` abre um navigator opcional que envia PDF
  de ate 10 MB, processa pela IA e preserva a revisao campo a campo antes de
  mesclar dados ao perfil. Exclusao remove objeto e metadata.
- Onboarding: `onboardingCompleted` e o unico controle de conclusao e e
  escrito em `MatchIntro`. O patch de consentimento nunca altera essa flag. O
  navigator retoma a primeira etapa minima ausente e um contexto de rascunho
  preserva selecoes quando o candidato volta entre etapas. Salario, CV,
  educacao, skills e interesses nao bloqueiam o feed.
- Preferencias: aceita até três áreas e exige ao menos uma modalidade, cidade e estado; disponibilidade
  para mudanca e opcional. Educacao posterior aceita ensino medio, tecnico,
  graduacao, pos-graduacao, bootcamp, autodidata, transicao de carreira ou
  preferencia por nao informar.
- Exclusao de conta: exige confirmacao destrutiva e autenticacao recente; a
  callable apaga `users/{uid}` recursivamente, o prefixo de Storage, eventos,
  feedbacks e reports pessoais, e somente entao a conta de Authentication. O
  cliente limpa sessao e AsyncStorage depois da resposta concluida.
- Vagas: `getJobs` consulta `isActive == true`, `status == live`,
  `verificationStatus == verified` e `curationStatus == approved`, ordena por
  `createdAt`, pagina por cursor e filtra prazos vencidos. `useJobs`
  compartilha lotes e requisicoes em memoria durante a sessao, inclusive com a
  tela de detalhe, evitando reler todo o catalogo. Criacao e atualizacao
  calculam qualidade e podem disparar classificacao por IA.
- Qualidade de vagas: `functions/shared/jobPipeline.js` e o contrato unico entre
  app, scripts e backend. Ele valida campos, proveniencia, URLs, localizacao,
  salario, duplicatas, consistencia e prazos sem preencher ausencias. Novas
  importacoes usam ID estavel/fingerprint, ficam inativas ate revisao e guardam
  versoes do schema/parser. O feed exige vaga `live`, ativa, aprovada, verificada
  e revisada nos ultimos 14 dias. `expireJobs` mantem o banco alinhado e
  `reportJob` conta uma denuncia por UID, pausando apos tres usuarios distintos.
- Feed: carregamento inicial, paginacao, refresh, retry e fim da lista possuem
  estados separados. Uma impressao e gravada somente depois de 1,2 segundo com
  pelo menos 80% do card visivel. O histórico altera a descoberta conforme os
  filtros, mas curtir preserva o card atual até o usuário navegar. Pass e
  curtida usam atualização otimista com rollback.
- Likes: documentos em `users/{uid}/likes/{jobId}` guardam timestamp e snapshot
  sanitizado da vaga; descurtir remove o documento. Novas mudancas fazem escrita
  atomica tambem no documento canonico de interacao.
- Candidaturas: tocar no CTA valida a URL, registra `applyOpenedAt` na interacao
  e abre o navegador sem criar candidatura. O `ApplicationFlowProvider` guarda
  uma confirmacao pendente minima no AsyncStorage do UID e observa `AppState`.
  Ao voltar ao foreground, somente "Sim, me candidatei" cria
  `users/{uid}/applications/{jobId}`. "Ainda nao" encerra o lembrete e preserva
  o historico de abertura; "Lembrar depois" mantem o lembrete persistido.
- Tracker: novas candidaturas guardam somente `jobId`, titulo, empresa,
  localizacao, logo, URL, datas, fonte, `confirmedByUser: true` e status manual
  (`applied`, `interviewing`, `rejected`, `offer` ou `hired`). Documentos antigos
  com `job` completo continuam hidratados. O snapshot mantem o registro visual,
  mas o detalhe so abre depois de buscar uma publicacao atual acessivel pelo ID.
- Interacoes: `users/{uid}/interactions/{jobId}` concentra `firstViewedAt`,
  `lastViewedAt`, `passedAt`, `likedAt`, `applyOpenedAt`, `appliedAt` e
  `lastActionAt`; aberturas tambem guardam contador e origem. O feed acompanha
  interações, likes e candidaturas por listeners, para não manter curtidas
  legadas obsoletas após descurtir. Nao ha migracao destrutiva:
  dados antigos continuam validos e toda nova acao passa a ser escrita nos dois
  formatos. Undo apaga somente `passedAt` e recusa restaurar uma vaga que tenha
  curtida ou candidatura concorrente.
- Match: `src/constants/taxonomy.ts` define IDs estaveis para area, modalidade,
  oportunidade, contrato, localizacao e competencias. Novas escritas guardam os
  IDs junto dos textos legados; leituras antigas usam aliases, sem migracao em
  massa. `computeMatchScore` e local e deterministico: area 25, skills 25,
  modalidade 20, oportunidade/contrato 15 e localizacao 15, normalizados apenas
  pelas dimensoes avaliaveis. Salario ajusta no maximo cinco pontos quando a
  preferencia e a faixa confiavel existem. O resultado inclui score, confianca,
  completude, motivos, dados ausentes, skills encontradas e requisitos nao
  identificados. Interesses nao sao tratados como competencias. A IA pode gerar
  uma explicacao separada, mas nao altera o numero.
- Consentimento: `users/{uid}` registra `termsAccepted`, versoes dos Termos e da
  Politica, data do servidor, locale e versao do app. Consentimento e onboarding
  sao independentes; perfis antigos sem `onboardingCompleted: true` retomam a
  primeira etapa minima ausente sem perder campos existentes.
- IA: o cliente envia somente `feature`, payload tipado e versao do schema.
  `cv_parse`, `job_summary`, `match_explanation` e `cv_coach` formam a allowlist
  do beta. Modelo, prompt, tools, tokens, temperatura, endpoint e validacao da
  resposta ficam em `functions/ai`. Recursos caros fora da allowlist nao fazem
  chamada de rede e podem ser desligados pelo parametro `AI_ENABLED_FEATURES`.
- Analytics e monitoramento: `src/utils/analytics.ts` e a interface unica de
  PostHog (`track`, `identify`, `reset`, `screen`, `setUserProperties`) e aplica
  allowlist de propriedades antes do envio. React Navigation 7 informa telas
  manualmente. `src/services/monitoring.ts` centraliza Sentry, remove PII e
  mantem session replay desligado. O app nao grava mais analytics na colecao
  Firestore `events`; a taxonomia completa esta em `docs/BETA-METRICS.md`.
- Feedback: candidatos autenticados podem criar documentos validados em
  `feedback`; apenas admins podem ler/moderar. Nota, categoria e origem entram
  no analytics, mas o comentario livre fica somente no Firestore.
- Distribuicao: `eas.json` define development client, preview interno e
  production de loja com ambientes separados e incremento remoto. O app usa
  versao `1.0.0`, build inicial iOS/Android `1` e runtime derivada da versao.
  EAS Update nao foi adotado sem um project ID confirmado.
- Completude: o feed usa convite eventual de CV, dispensável e restrito à tela
  em foco; a completude fica no Perfil. Feedback também respeita foco e intervalo.
  Cobertura de dados no match não é apresentada como probabilidade de acerto.
- Eventos de onboarding: `onboarding_started`, etapa concluida/abandonada,
  `onboarding_completed`, `cv_skipped` e `cv_uploaded_later` usam payloads sem
  conteudo pessoal.

## Pontos de seguranca existentes

- Segredo da IA projetado para Secret Manager e ausente do bundle cliente.
- Function exige Firebase Auth, valida chaves/tamanhos, aplica quotas atomicas
  por UID/feature, bloqueia concorrencia e replay curto e limita instancias.
- Auditoria em `aiEvents` guarda somente UID, feature, modelo, tokens, duracao,
  sucesso, categoria e custo estimado; payloads e conteudo nao sao registrados.
- `aiQuotas` e `aiEvents` sao inacessiveis ao cliente pelas regras locais.
- Firestore separa dados privados por UID e bloqueia escrita cliente em admins.
- Upload de curriculo exige usuario autenticado e limita tipo/tamanho na UI.
- `storage.rules` restringe leitura, escrita e exclusao ao UID proprietario e
  aceita apenas o caminho legado ou PDFs versionados, nao vazios e de ate 10 MB.
- Testes no Emulator Suite cobrem isolamento de Firestore, interacoes do feed e
  Storage; testes da Function cobrem ausencia de Auth, CV, subcolecoes,
  repeticao e falha parcial.
- Likes e candidaturas salvam snapshots reduzidos, evitando copiar todo o objeto.
- Listeners do feed usam UID do AuthContext e cleanup. A compatibilidade legada
  exige leituras extras; sua eliminação depende de migração e reconciliação.

## Pontos frageis

- Exclusão com operações em curso pode permitir recriação tardia de dados.
  Bloqueador ainda aberto: `docs/ACCOUNT-DELETION-LIFECYCLE-PLAN.md`.
- O envio oficial do Hirly Apply não existe. Contratos automáticos não são
  integração operacional; plano: `docs/HIRLY-APPLY-PILOT-AND-PUBLIC-PLAN.md`.
- `newArchEnabled` está habilitado por compatibilidade com Reanimated 4.
  Exportação JS passou; falta validar binários assinados em aparelhos.

- App Check esta preparado na callable, mas o enforcement permanece desligado
  ate a configuracao nativa e manual descrita em `docs/APP-CHECK-MANUAL-SETUP.md`.
- `jobs/{jobId}/meta`, `aiQuotas` e `aiEvents` sao somente leitura ou bloqueados
  para clientes conforme sua finalidade; denuncias e contadores passam pelo
  backend idempotente.
- Perfis antigos podem continuar contendo `cv.url` ate novo upload ou exclusao;
  o campo e lido por compatibilidade, mas nao e criado pelo fluxo novo.
- O CI esta versionado, mas ainda nao ha execucao remota confirmada nem deploy
  das Rules/Functions no projeto do proprietario.
- `firestore.indexes.json` esta integrado; o indice composto dos quatro estados
  de publicacao com `createdAt` precisa ser implantado e aguardar conclusao.
- Vagas legadas sem todos os estados de publicacao nao entram mais no feed. O
  catalogo precisa de revisao/backfill administrativo nao destrutivo.
- O retorno de navegador varia entre iOS, Android e navegadores instalados. A
  maquina de estados possui testes automatizados, mas o ciclo de `AppState` e o
  clipboard precisam de validacao em builds nativos reais.
- A lista de cidades do onboarding e intencionalmente enxuta para o beta
  brasileiro; cobertura, acessibilidade e retomada apos encerramento do app
  ainda precisam de QA em aparelhos reais.
- Termos e Politica sao rascunhos funcionais no app, mas identidade juridica,
  bases legais, retencao, operadores e URLs publicas dependem das acoes em
  `docs/LEGAL-MANUAL-REVIEW.md`.
