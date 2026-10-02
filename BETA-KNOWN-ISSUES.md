# Beta Known Issues

Data da revisao: 2026-09-09.

## Bloqueadores externos

- A revogacao das credenciais privadas removidas ainda nao foi confirmada.
- Termos, Privacidade, identidade do controlador, canais e revisao juridica
  dependem de preenchimento e aprovacao profissional.
- Rules, indices e Functions deste repositorio ainda precisam ser implantados e
  validados no projeto Firebase correto.
- App Check, PostHog, Sentry, AASA/assetlinks, EAS e lojas ainda dependem das
  contas e identificadores do proprietario.
- A auditoria atual encontrou 401 problemas em 76 registros de vagas, sem
  criticos. O catalogo de teste ainda nao representa vagas reais curadas.
- Nao existe preview assinado nem QA integral em iPhone e Android fisicos.

## Bloqueador de código identificado nesta revisão

- Exclusão pode informar sucesso e uma operação em curso recriar dados depois.
  **Não resolvido.** Impede piloto com currículos reais até implementar e testar
  `ACCOUNT-DELETION-LIFECYCLE-PLAN.md`. Não basta revogar token ou limpar duas vezes.
- Relatório e correções locais: `APP-REVIEW-2026-09-09.md`.

## Cobertura e qualidade

- O gate local cobre testes de unidade, integracao e 30 cenarios nos emuladores.
  Navegador externo, retorno de background, leitores de tela, crash simbolicado e
  exclusao remota ainda exigem o roteiro manual em builds assinados.
- TypeScript estrito e ESLint passam sem erros ou avisos. Isso nao substitui QA
  de foco, fonte ampliada, contraste, teclado e alvos de toque em aparelhos.
- Falhas de perfil agora bloqueiam o roteamento em vez de reiniciar onboarding;
  esse estado deve ser exercitado com rede instavel em aparelho.
- Recursos antigos sem entrada na navegacao (`agentTools`, pitch e entrevista
  longa) permanecem fora do bundle e desativados. Uma remocao definitiva pode ser
  feita pos-beta depois de decidir o futuro do assistente.

## Plataforma e dependencias

- `npm audit --omit=dev` registra 17 achados moderados e 10 altos na arvore do
  app, além de 9 moderados nas Functions; não há críticos. Os altos vêm da
  cadeia Expo/Metro. A correção indicada exige Expo 57, e a cadeia Firebase
  exige Firebase Admin 13. Ambos são upgrades quebradores e precisam de fase
  própria com testes nativos.
- `newArchEnabled` foi habilitado: Reanimated 4 da versão atual exige New
  Architecture. Os bundles web/iOS/Android exportam, mas falta QA em binário nativo.
- EAS Update nao foi adotado; rollback requer novo binario com versao superior.
- Java 21 e necessario para os emuladores. O JRE em `/tmp` e apenas um recurso
  desta maquina e nao deve ser assumido em outros ambientes.

## Dados legados e produto

- Perfis, likes e candidaturas legadas continuam compativeis, sem backfill
  destrutivo. Snapshots antigos nao abrem candidatura sem confirmar que a vaga
  publicada ainda existe.
- O novo upload de CV usa arquivo versionado e preserva o anterior ate a metadata
  ser confirmada. As Storage Rules correspondentes precisam ser implantadas.
- A cobertura de cidades e aliases da taxonomia precisa de validacao com dados e
  candidatos reais.
- Entrevista longa, agentes, regeneracoes ilimitadas, notificacoes e recursos
  caros ficam deliberadamente para depois do beta.
