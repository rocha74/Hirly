# Beta Final Manual Actions - Tarefas 1 a 12

Checklist consolidado para o proprietario. Itens repetidos entre tarefas foram
unificados, mas nenhuma dependencia externa conhecida foi omitida.

## 1. Seguranca e credenciais - Tarefas 1, 2 e 4

- [ ] Revogar a antiga chave do provedor de IA removida de `.env.local`, criar
  outra com limite de gasto e guarda-la apenas no Secret Manager.
- [ ] Desativar/excluir a chave da conta de servico removida, revisar privilegios
  e usar ADC/identidade sem chave sempre que possivel.
- [ ] Verificar que as credenciais antigas falham e revisar logs de auditoria.
- [ ] Configurar `ANTHROPIC_API_KEY` e `AI_ENABLED_FEATURES` nas Functions; definir
  retencao de `aiEvents`, alertas de custo e quotas.
- [ ] Revisar dominios autorizados do Auth, orcamentos e logs sem PII.
- [ ] Se algum segredo surgir no historico: revogar, coordenar `git filter-repo`,
  forcar novos clones e repetir `secrets:check --history`.

## 2. Firebase - Tarefas 2, 4, 5, 9, 10 e 11

- [ ] Confirmar o projeto com `firebase use` antes de cada comando.
- [ ] Implantar Firestore Rules, Storage Rules e indices; aguardar todos os
  indices do feed ficarem prontos.
- [ ] Implantar e testar `deleteMyAccount`, `callAiFeature`, `reportJob`,
  `resolveJobLink` e `expireJobs`; remover o endpoint legado `anthropicProxy`.
- [ ] Validar exclusao com/sem CV, subcolecoes, feedback, eventos, falha parcial,
  retry e Auth removido ao final usando dados descartaveis.
- [ ] Configurar faturamento/Cloud Scheduler para `expireJobs`, acompanhar a
  execucao a cada seis horas e criar alertas.
- [ ] Criar/revisar `admins/{uid}` por processo administrativo de menor privilegio.
- [ ] Testar isolamento entre duas contas para perfil, likes, candidaturas,
  interacoes, feedback, reports, metadata e CV.
- [ ] Implantar Rules de feedback e confirmar escrita autenticada e leitura apenas
  administrativa.

## 3. App Check - Tarefa 4

- [ ] Registrar apps iOS/Android no Firebase App Check.
- [ ] Adicionar uma integracao nativa revisada, configurar debug provider apenas
  em desenvolvimento e guardar token debug fora do bundle.
- [ ] Configurar App Attest/DeviceCheck e Play Integrity, gerar novos binarios e
  observar tokens antes de ativar `AI_ENFORCE_APP_CHECK=true` e
  `APPLY_ENFORCE_APP_CHECK=true`.
- [ ] Testar build legitimo e rejeicao sem token; revogar tokens debug antigos.

## 4. Legal e privacidade - Tarefas 3 e 10

- [ ] Preencher todos os marcadores de `docs/LEGAL-MANUAL-REVIEW.md`: controlador,
  identificacao, endereco, vigencia, suporte, privacidade e takedown.
- [ ] Definir com revisao profissional idade minima, bases legais, retencao,
  operadores/suboperadores, transferencias, direitos LGPD, incidentes, foro,
  marcas/logos e moderacao.
- [ ] Aprovar Termos/Privacidade `2026-07-10`, publicar URLs HTTPS separadas e
  definir reconsentimento quando a versao mudar.
- [ ] Conferir textos e formularios de privacidade das lojas contra o app real.

## 5. Vagas, feed e match - Tarefas 5, 8 e 9

- [ ] Corrigir os 931 problemas nas 151 entradas dos relatorios de auditoria;
  remover duplicatas e revisar cada vaga antes de `live`/`isActive`.
- [ ] Auditar/reverificar vagas reais no Firestore e migrar estados legados apenas
  por script revisado, sem operacao destrutiva.
- [ ] Testar paginacao, refresh, fim, retry, cache, pass, like, undo, persistencia
  e rollback offline com duas contas.
- [ ] Testar denuncia idempotente com tres usuarios, auto-pausa, expiracao por
  deadline/expiresAt e reverificacao administrativa.
- [ ] Validar aliases de area/skills, IDs canonicos, confianca e score com amostra
  real; decidir o peso parcial de disponibilidade para mudanca.

## 6. Onboarding, CV e candidatura - Tarefas 6 e 7

- [ ] Em iOS/Android, concluir cadastro sem CV, voltar entre etapas, retomar perfil
  legado e confirmar que perfil incompleto nao bloqueia vagas.
- [ ] Testar upload opcional posterior, revisao, exclusao, banner, MIME/tamanho,
  concorrencia e isolamento do CV.
- [ ] Revisar cobertura de cidades e decidir entrada manual para ausentes.
- [ ] Testar Safari/Chrome, as tres respostas da confirmacao, app encerrado,
  lembrete, duplicacao, clipboard e link quebrado/denuncia.
- [ ] Confirmar eventos de onboarding/CV/candidatura sem PII.

## 7. Analytics e monitoramento - Tarefa 10

- [ ] Criar projetos PostHog/Sentry, definir regiao, acesso, retencao e ambientes.
- [ ] Configurar variaveis EAS; manter `SENTRY_AUTH_TOKEN` como `sensitive` e sem
  prefixo publico.
- [ ] Gerar novo build nativo, validar eventos, UID pseudonimo/reset no logout,
  crash simbolicado e ausencia de CV, PII e prompts.
- [ ] Criar dashboards/alertas de `docs/BETA-METRICS.md`; revisar metas apenas
  como hipoteses. Manter autocapture, GeoIP e session replay desativados.

## 8. Deep links, EAS e lojas - Tarefa 11

- [ ] Obter Apple Team ID e SHA-256 reais de EAS/Play; preencher e hospedar AASA
  e assetlinks nos dois hosts, sem redirect e com `application/json`.
- [ ] Habilitar Associated Domains/App Links, reinstalar builds e testar todos os
  estados de link em aparelhos reais.
- [ ] Executar `eas login`, `eas init`, `eas build:configure` e
  `eas build:version:set` na conta correta; nao reutilizar project ID alheio.
- [ ] Configurar environments/credenciais, registrar aparelhos iOS e gerar builds
  development e preview.
- [ ] Revisar icones/splash em aparelhos e lojas. Decidir separadamente se EAS
  Update sera adotado.
- [ ] Autorizar e executar TestFlight/Google Play Closed Testing somente depois
  de todos os bloqueadores; nenhuma submissao foi feita localmente.

## 9. Release gate - Tarefa 12

- [ ] Rodar o workflow GitHub `Beta check` em PR e confirmar resultado verde.
- [ ] Instalar Java 21 no CI/maquinas que executam Rules.
- [ ] Executar todo `docs/BETA-MANUAL-TEST-PLAN.md` em dois aparelhos e registrar
  evidencias; simular ao menos um rollback.
- [ ] Manter o ESLint verde e migrar, em fase própria, os 17 achados moderados e
  10 altos do app e 9 moderados das Functions, sem `audit fix --force`.
- [ ] Completar auditoria VoiceOver/TalkBack, fonte ampliada, rede lenta, memoria,
  imagens, FlatList, listeners e chamadas repetidas de IA.
- [ ] Gerar o primeiro preview assinado. O ambiente local nao possui login EAS e
  por isso nao produziu artefato externo nesta sequencia.

## Nao executado automaticamente

Nao foram executados deploy Firebase, configuracao em consoles, revogacao de
credenciais, aprovacao juridica, criacao de PostHog/Sentry, App Check, hospedagem
de dominio, build assinado, TestFlight ou Google Play. Esses estados dependem de
contas externas e devem ser comprovados pelo proprietario.
