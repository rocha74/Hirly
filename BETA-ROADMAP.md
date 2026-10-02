# Beta Roadmap

Preparacao do Hirly para um beta real, focado exclusivamente em candidatos a
estagio, trainee e primeiro emprego.

## Pendente

- Nenhum bloco de implementacao desta sequencia. Permanecem acoes externas e QA
  em aparelhos, listados em `docs/BETA-FINAL-MANUAL-ACTIONS.md`.

## Em andamento

- Nenhuma tarefa. Aguardar o proximo prompt; nao avancar automaticamente.

## Concluido

- Bloco 01 - Baseline seguro: auditoria Git e de segredos, limpeza dos arquivos
  privados locais, ampliacao do `.gitignore`, scanner sem exposicao de valores,
  scripts de verificacao, arquitetura atual e acoes manuais documentadas.
- Tarefa 2 - Curriculo protegido por regras de Storage, metadata sem URL
  permanente, upload validado e exclusao integral por callable idempotente com
  reautenticacao, limpeza local e testes de regras/Function.
- Tarefa 3 - `AuthProvider` unico, hooks sem listeners duplicados, perfil
  centralizado, onboarding separado de consentimento versionado, documentos
  legais acessiveis no app e textos alinhados ao MVP atual.
- Tarefa 4 - Backend de IA com contrato tipado, allowlist de quatro features,
  prompts e limites no servidor, quotas atomicas, auditoria sanitizada, recursos
  caros desativados e App Check preparado para configuracao nativa.
- Tarefa 5 - Feed paginado por cursor e compartilhado em memoria, vagas
  expiradas/incompativeis removidas, interacao canonica com compatibilidade
  legada, pass/like/candidatura persistentes, impressao qualificada, rollback e
  undo real do ultimo pass.
- Tarefa 6 - Candidatura externa separada de confirmacao, lembrete persistente
  no retorno ao foreground, URL validada com copia/denuncia em falhas, tracker
  explicitamente manual e snapshot minimo idempotente compativel com legados.
- Tarefa 7 - Onboarding reduzido a consentimento, objetivo, area e preferencias;
  curriculo/educacao/skills/interesses opcionais, rascunho preservado ao voltar,
  completude no feed e contagens estaticas removidas.
- Tarefa 8 - Taxonomia canonica compativel com dados legados, score
  deterministico normalizado apenas pelas dimensoes avaliaveis, salario como
  ajuste limitado, confianca/completude explicitas e skills separadas de
  interesses.
- Tarefa 9 - Schema unico de publicacao, auditoria JSON/CSV acionavel,
  importacao idempotente, seeds isolados, expiracao/reverificacao, painel de
  qualidade e denuncias com moderacao idempotente no backend.
- Tarefa 10 - PostHog por interface interna e taxonomia validada, Sentry com
  ErrorBoundary e remocao de PII, identidade resetada no logout, feedback
  autenticado com Rules e metricas do beta documentadas.
- Tarefa 11 - Deep links com retomada apos login/onboarding, resolucao segura de
  vagas, estados de erro, associacao de dominio preparada, perfis EAS, permissoes
  minimas e assets reais de distribuicao.
- Tarefa 12 - Gate local com Jest/RNTL, ESLint, suites existentes, emuladores,
  CI sem credenciais e planos de release, teste manual, rollback e pendencias.
- Remake visual do beta - nova identidade Hirly, sistema visual mineral com
  superficies de vaga em papel, navegacao principal persistente, autenticacao,
  onboarding, feed, detalhe, curtidas, candidaturas, perfil e ferramentas do
  candidato migrados sem alterar os contratos de backend.
- Revisao integral de julho - consulta do feed alinhada as Rules, falhas de
  historico tratadas de forma fail-safe, recursos deterministas desbloqueados,
  CV versionado sem perda na substituicao, snapshots antigos impedidos de abrir
  vagas encerradas, estado entre contas isolado e documentos legais acessiveis
  pelo Perfil.
- Site oficial - landing React/Vite independente, responsiva e acessivel,
  alinhada a identidade azul/violeta do app, com demonstracao do feed, curriculo,
  tracker, privacidade, QR configuravel e paginas legais separadas.

## Validacao da revisao integral - 2026-07-16

- TypeScript estrito e ESLint: aprovados sem erros ou avisos.
- Testes locais: 101 cenarios de unidade/integracao aprovados.
- Auth, Firestore e Storage Emulator: 23 cenarios aprovados, incluindo a consulta
  exata do feed e o caminho versionado de CV.
- Exports Expo: iOS com 3.753 modulos e bundle Hermes de 9,20 MB; Android com
  3.752 modulos e bundle Hermes de 9,21 MB.
- Auditoria de vagas: 151 registros e 870 problemas (2 criticos, 794 erros e 74
  avisos). O conteudo segue bloqueando o beta real.
- `npm audit --omit=dev`: 16 vulnerabilidades moderadas no app e 9 nas Functions,
  sem achados altos ou criticos apos atualizacao transitiva compativel.
- Nenhum deploy, build assinado ou configuracao externa foi executado.

## Baseline registrado

- `npm ci`: concluido; lockfile e dependencias instalados de forma limpa.
- `npm run check`: concluido; scanner passou, TypeScript passou e Expo Doctor
  passou em 18/18 verificacoes com acesso de rede.
- Bundle Expo iOS: exportacao concluida em diretorio temporario, com 3.267
  modulos resolvidos e sem imports ou assets quebrados.
- Alertas que exibiam codigos ou mensagens internas foram sanitizados; detalhes
  permanecem apenas nos logs de desenvolvimento.
- Historico Git: um unico commit; nenhum padrao privado encontrado pela varredura
  e nenhum dos arquivos locais removidos apareceu no historico.
- Dependencias do app: `npm audit fix` reduziu 21 achados para 12 moderados. A
  correcao restante proposta pelo npm exige upgrade quebrador para Expo 57.
- Dependencias das Functions: instalacao e lockfile criados; restam 9 achados
  moderados cuja correcao proposta exige `firebase-functions` 7.
- Testes automatizados: 9 cenarios da exclusao de conta e 8 cenarios das regras
  de Firestore/Storage executados com sucesso.
- Regras Firebase: Firestore e Storage passaram no Emulator Suite usando JRE
  portatil local; nenhum deploy foi executado.
- Configuracoes ainda incompletas: App Check nao confirmado e colecoes de
  analytics/evals nao cobertas pelas regras locais de Firestore.

## Validacao da Tarefa 3

- `npm install`: concluido; 1.405 pacotes auditados e 17 vulnerabilidades
  moderadas reportadas. Nenhum upgrade quebrador foi aplicado automaticamente.
- `npm run typecheck` e `npm run secrets:check`: concluidos sem erros.
- Expo Doctor: 18/18 verificacoes aprovadas.
- Testes: 9/9 cenarios da Function e 8/8 cenarios das regras de Firestore e
  Storage aprovados no Emulator Suite.
- Bundle Expo iOS: exportado em diretorio temporario, com 3.271 modulos e sem
  imports, rotas ou assets quebrados.
- Documento Word do plano de negocios: 28 paginas renderizadas e inspecionadas
  apos a remocao das referencias de marca legadas.
- Nenhum deploy, configuracao de console ou aprovacao juridica foi executado.

## Validacao da Tarefa 4

- `npm run check`: scanner e TypeScript aprovados, 18/18 testes das Functions
  aprovados e Expo Doctor aprovado em 18/18 verificacoes.
- Os 9 testes novos de IA cobrem contrato estrito, campos extras, payload
  grande, quotas, regeneracao, concorrencia, resposta invalida e App Check.
- Firestore e Storage Rules: 9/9 cenarios aprovados no Emulator Suite, incluindo
  bloqueio cliente de `aiQuotas` e `aiEvents`.
- Bundle Expo iOS: 3.271 modulos resolvidos sem imports ou assets quebrados.
- A carga local das Functions exportou somente `callAiFeature` e
  `deleteMyAccount` com configuracao Firebase descartavel.
- Nenhum deploy, segredo, parametro remoto ou App Check foi configurado fora do
  repositorio.

## Validacao da Tarefa 5

- `npm ci` na raiz e em `functions/`: concluidos; permanecem 17 e 9
  vulnerabilidades moderadas, respectivamente, sem upgrade quebrador aplicado.
- `npm run check`: scanner, TypeScript, 18/18 testes das Functions e Expo Doctor
  aprovado em 18/18 verificacoes.
- Firestore e Storage Rules: 11/11 cenarios aprovados no Emulator Suite,
  incluindo leitura/escrita da propria interacao e bloqueio entre candidatos.
- Bundle Expo iOS: 3.273 modulos resolvidos sem imports ou assets quebrados.
- `firebase.json` e `firestore.indexes.json` foram parseados localmente; nenhum
  deploy de regras ou indices foi executado.

## Validacao da Tarefa 6

- `npm run check`: scanner de segredos, TypeScript, 18/18 testes das Functions,
  9/9 testes do ciclo de candidatura e Expo Doctor 18/18 aprovados.
- Os testes de candidatura cobrem URL, ordem de abertura, erro, retorno do
  background, deduplicacao, confirmacao exclusiva, "Ainda nao", lembrete e
  falha de confirmacao com retry posterior.
- Firestore e Storage Rules: 12/12 cenarios aprovados, incluindo snapshot minimo
  gravado duas vezes no mesmo ID sem duplicacao e isolamento entre usuarios.
- Bundle Expo iOS: 3.283 modulos resolvidos com `expo-clipboard`, sem imports ou
  assets quebrados.
- Nenhum deploy, build nativo de loja ou configuracao externa foi executado.

## Validacao da Tarefa 7

- `npm run check`: scanner de segredos, TypeScript, 18/18 testes das Functions,
  9/9 testes de candidatura, 5/5 testes do onboarding e Expo Doctor 18/18
  aprovados.
- Os testes do onboarding cobrem ordem/retomada, independencia do consentimento,
  entrada sem CV/educacao/skills/interesses/salario, bloqueio sem preferencias e
  calculo dos itens opcionais exibidos pelo banner de completude.
- Firestore e Storage Rules: 12/12 cenarios aprovados no Emulator Suite.
- Bundle Expo iOS: 3.286 modulos resolvidos, incluindo o navigator opcional de
  CV e revisao, sem imports ou assets quebrados.
- `npm audit --omit=dev`: 12 achados moderados no app e 9 nas Functions; as
  correcoes completas sugeridas exigem upgrades quebradores e ficaram pendentes.
- Busca local confirmou a remocao das contagens estaticas de vagas solicitadas.
- Nenhum deploy, build de loja ou configuracao externa foi executado.

## Validacao da Tarefa 8

- `npm ci`: 1.408 pacotes instalados na raiz e 239 em Functions; permanecem 17
  achados moderados na arvore completa do app, 12 em producao, e 9 nas Functions.
- `npm run check`: scanner de segredos e TypeScript aprovados, 44/44 testes
  automatizados aprovados e Expo Doctor aprovado em 18/18 verificacoes.
- A suite cobre perfil vazio, salario ausente, multiplos objetivos, aliases de
  area e skill, falso positivo Java/JavaScript, modalidade, remoto, cidade/UF
  legada, dados incompletos, limites do score e repetibilidade.
- Firestore e Storage Rules: 12/12 cenarios aprovados no Emulator Suite com JRE
  temporario, sem alteracao ou deploy das regras.
- Bundle Expo iOS: 3.287 modulos resolvidos sem imports ou assets quebrados.
- Nenhum deploy, migracao destrutiva ou chamada de IA participa do score.

## Validacao da Tarefa 9

- `npm ci`: 1.408 pacotes instalados na raiz e 239 em Functions; permanecem 17
  e 9 vulnerabilidades moderadas, respectivamente.
- `npm run jobs:audit`: 151 entradas auditadas e relatorios JSON/CSV gerados;
  798 problemas encontrados naquele baseline, principalmente campos do novo schema,
  verificacao vencida e 75 duplicatas entre os lotes JSON/CSV analisados.
- Testes das Functions: 29/29 aprovados, incluindo schema, auditoria,
  idempotencia, moderacao e expiracao.
- `npm run check`: scanner, TypeScript, 55/55 testes automatizados e Expo Doctor
  18/18 aprovados.
- Firestore e Storage Rules: 16/16 cenarios aprovados; cliente nao grava
  denuncias, nao le drafts e admin nao publica vaga incompleta.
- Bundle Expo iOS: 3.288 modulos resolvidos sem imports ou assets quebrados.
- Carga local confirmou `callAiFeature`, `deleteMyAccount`, `reportJob` e
  `expireJobs`. Nenhum deploy ou configuracao do Scheduler foi executado.

## Validacao da Tarefa 10

- `npx expo install`: instalou as versoes compativeis com Expo SDK 54 de
  PostHog, Sentry, Application, Device e Localization; permanecem 17 achados
  moderados na arvore completa e 12 em dependencias de producao.
- `npm run check`: scanner de segredos, TypeScript, 58/58 testes automatizados
  e Expo Doctor 18/18 aprovados.
- Os 3 testes novos de privacidade bloqueiam nome, e-mail, telefone, CV, prompt,
  resposta de IA, numeros invalidos e strings excessivas no analytics.
- Firestore e Storage Rules: 18/18 cenarios aprovados no Emulator Suite com JRE
  Temurin portatil, incluindo schema de feedback, isolamento e campos extras.
- Bundle Expo iOS: 3.791 modulos resolvidos com Sentry/PostHog e source-map
  instrumentation, sem imports ou assets quebrados.
- Busca local confirmou ausencia de escrita cliente em `/events` e imports dos
  fornecedores restritos aos dois adaptadores internos.
- Os paineis externos nao foram configurados nem testados por falta dos projetos
  e variaveis do proprietario; nenhuma regra ou build foi implantado.

## Validacao da Tarefa 11

- `npx expo install`: adicionou `expo-linking` e `expo-dev-client` nas versoes
  recomendadas para o Expo SDK 54. O audit atual registra 21 vulnerabilidades
  moderadas na arvore completa, 16 em producao e 9 nas Functions.
- `npm run check`: scanner de segredos, TypeScript, 67/67 testes automatizados e
  Expo Doctor 18/18 aprovados.
- Os 7 testes novos do cliente cobrem os tres formatos validos, URLs hostis,
  geracao canonica, login, onboarding, retomada com expiracao e resolucao; os 4 cenarios da callable
  cobrem autenticacao/validacao e vaga inexistente, ativa, inativa e expirada.
- Firestore e Storage Rules: 18/18 cenarios aprovados no Emulator Suite com JRE
  portatil; as Rules nao precisaram ser ampliadas para expor vagas inativas.
- Exports Expo: iOS com 3.802 modulos e Android com 3.801, sem imports ou assets
  quebrados. A carga local exportou cinco Functions, incluindo `resolveJobLink`.
- Introspeccao nativa confirmou camera, fotos e armazenamentos Android marcados
  para remocao; iOS nao possui descricoes de camera/fotos. Internet e vibracao
  permanecem por uso real; overlay aparece somente no manifest debug do RN.
- Icone iOS 1024x1024 sem alpha, adaptive icon 1024x1024 com transparencia,
  splash e favicon foram renderizados e inspecionados a partir da marca Hirly.
- `eas-cli config` nao concluiu porque exige login Expo. Nenhum project ID,
  credencial, build, submit, deploy ou configuracao de loja foi inventado.

## Validacao da Tarefa 12

- `npm ci` na raiz e em `functions/`: concluido com lockfiles reproduziveis.
- `npm run beta:check`: codigo zero; scanner, TypeScript, lint, 91 testes de
  unidade/integracao, auditoria de vagas, 21 testes de Rules e Expo Doctor foram
  executados em sequencia sem ocultar falhas.
- Jest/RNTL: 24/24; suites existentes: 67/67; Auth/Firestore/Storage Emulator:
  22/22; total automatizado: 113/113.
- Expo Doctor: 18/18. Exports iOS e Android concluidos em `/tmp` sem imports ou
  assets quebrados.
- Auditoria de vagas naquele gate: 151 registros, 798 problemas, incluindo 2 criticos; os
  relatorios permanecem ignorados pelo Git por poderem conter dados importados.
- ESLint naquele gate: zero erros e 105 avisos legados visiveis. Auditoria npm de producao:
  16 vulnerabilidades moderadas no app e 9 nas Functions.
- O preview assinado nao foi gerado: `eas whoami` confirmou ausencia de login,
  Xcode completo nao esta selecionado e nao existe Android SDK local configurado.
- Nenhum deploy, alteracao em console, revogacao, build externo ou submissao foi
  executado.

## Validacao do remake visual

- `npm run typecheck`: aprovado depois da migracao dos componentes e telas.
- ESLint: zero erros e 62 avisos legados; nenhum aviso foi ocultado.
- Validacao visual web em 390 x 844 e 320 x 568: abertura, cadastro, login,
  estado de link e card real do feed inspecionados sem sobreposicao de texto.
- O card do feed foi validado com titulo longo, salario, match, skills, badges e
  dock; o modo compacto preservou as acoes essenciais.
- A raiz web e as rotas de autenticacao agora restauram corretamente apos
  reload, sem cair no estado de deep link invalido.
- Testes automatizados do app e Functions: 92 aprovados. Emulator Suite:
  22 testes de Auth, Firestore e Storage aprovados; total automatizado do gate:
  114/114. Expo Doctor: 18/18.
- Export local Expo concluido para iOS (3.756 modulos, bundle Hermes de 9,24 MB)
  e Android (3.755 modulos, bundle Hermes de 9,25 MB). A carga tipografica foi
  reduzida das familias completas para nove arquivos efetivamente usados: de
  73 para 25 assets no iOS e de 74 para 26 no Android. O aviso de Sentry sobre
  organizacao/projeto permanece dependente das variaveis do ambiente EAS.
- `docs/DESIGN-SYSTEM.md` registra marca, tokens, componentes, acessibilidade e
  regras para manter consistencia nas proximas iteracoes.
- Nenhum deploy, conta externa, build de loja ou configuracao remota foi
  executado durante o remake.

## Bloqueado por acao manual

- O release beta permanece bloqueado pelos itens de
  `docs/BETA-RELEASE-CHECKLIST.md` e `docs/BETA-FINAL-MANUAL-ACTIONS.md`.

- Revogar e recriar as credenciais privadas identificadas localmente, conforme
  `docs/SECURITY-MANUAL-ACTIONS.md`.
- Confirmar no Firebase Console as regras implantadas de Firestore e Storage,
  dominios autorizados, App Check, projeto ativo e configuracao da Function.
- Implantar manualmente `storage.rules` e `deleteMyAccount` somente depois de
  revisar o projeto Firebase alvo e repetir os testes em CI.
- Concluir `docs/LEGAL-MANUAL-REVIEW.md`, aprovar profissionalmente as versoes
  legais e preencher todos os marcadores obrigatorios.
- Publicar e testar URLs HTTPS separadas para Termos e Privacidade; as telas
  internas funcionam, mas nao substituem a publicacao exigida pelas lojas.
- Criar e testar canais oficiais de suporte, privacidade e takedown.
- Implantar `callAiFeature`, configurar a allowlist e remover
  `anthropicProxy` do projeto remoto conforme `functions/README.md`.
- Concluir a integracao nativa e o rollout de App Check conforme
  `docs/APP-CHECK-MANUAL-SETUP.md` antes de ativar enforcement.
- Implantar o indice do feed com `firebase deploy --only firestore:indexes`
  depois de confirmar o projeto em `.firebaserc`/Firebase CLI e aguardar o
  indice ficar pronto antes dos testes beta.
- Revisar vagas legadas e preencher todo o estado de publicacao por rotina
  administrativa validada; o feed agora falha fechado para documentos sem o
  contrato completo.
- Gerar novos builds nativos apos a inclusao de `expo-clipboard` e validar o
  retorno de Safari/Chrome para o app em iOS e Android.
- Validar em iOS e Android o cadastro novo completo, retorno entre as quatro
  etapas, retomada de perfil legado e upload opcional de CV depois do feed.
- Validar o novo sistema visual em aparelhos iOS e Android reais, incluindo
  teclado, fontes, areas seguras, leitores de tela e tamanhos de texto ampliados.
- Revisar a nova marca antes da publicacao nas lojas e confirmar disponibilidade
  juridica do simbolo e do wordmark.
- Criar e configurar projetos PostHog/Sentry e variaveis EAS, gerar novos builds
  nativos, validar eventos e source maps sem PII e manter replay desativado,
  conforme `docs/ANALYTICS-MANUAL-SETUP.md`.
- Implantar e validar as Firestore Rules da colecao `feedback` no projeto alvo;
  nenhum deploy externo foi executado nesta tarefa.
- Preencher/hospedar AASA e Asset Links reais, implantar `resolveJobLink`,
  inicializar EAS na conta correta e executar o checklist de aparelhos/lojas em
  `docs/DEEP-LINK-MANUAL-SETUP.md` e `docs/EAS-BETA-SETUP.md`.
- Configurar destinos, suporte e dados legais do site conforme
  `docs/WEBSITE-MANUAL-SETUP.md`; publicar o build somente depois dessa revisao.
- Executar deploys, configuracoes de console e distribuicao em TestFlight/lojas
  somente quando um bloco futuro solicitar explicitamente.
