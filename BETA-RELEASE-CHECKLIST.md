# Beta Release Checklist

Data do gate local: 2026-08-03.

O codigo local passa o gate, mas o produto nao deve ser distribuido a candidatos
reais enquanto houver itens em **Bloqueadores**. Cada conclusao precisa de
evidencia no ambiente externo correspondente.

## Bloqueadores

- [ ] Confirmar revogacao/recriacao das credenciais de
  `docs/SECURITY-MANUAL-ACTIONS.md`.
- [ ] Concluir revisao juridica, preencher marcadores e publicar Termos e
  Privacidade em URLs HTTPS separadas.
- [ ] Confirmar o projeto Firebase e implantar Firestore Rules, Storage Rules,
  indices e Functions; validar exclusao, IA, denuncias, deep links e expiracao.
- [ ] Configurar App Check em builds assinados, observar tokens e so depois
  ativar enforcement.
- [ ] Corrigir o catalogo: 151 registros, 931 problemas (0 criticos, 794 erros e
  137 avisos). Os registros atuais permanecem fora do feed publicavel, mas não
  formam um catálogo utilizável até curadoria e reverificação.
- [ ] Configurar PostHog/Sentry e provar eventos sem PII, reset no logout, alertas
  e source maps de um crash de teste.
- [ ] Publicar AASA/assetlinks com IDs reais e testar links em iOS/Android.
- [ ] Inicializar EAS, gerar preview assinado e concluir o plano manual nos dois
  sistemas.
- [ ] Executar o workflow `Beta check` em PR e guardar uma execucao verde.

## Recomendados

- [ ] Manter TypeScript e ESLint em zero erros/avisos nas proximas mudancas.
- [ ] Planejar upgrades que removam os 17 achados moderados e 10 altos do app e
  9 moderados das Functions sem quebrar a matriz Expo/Firebase.
- [ ] Fazer auditoria VoiceOver/TalkBack, fonte ampliada, reducao de movimento,
  contraste, foco e alvos de toque.
- [ ] Medir FPS, memoria, renders, imagens, paginacao e listeners em aparelho de
  entrada e rede lenta.
- [ ] Ampliar testes de componentes para auth, onboarding, feed e tracker com
  adapters Firebase injetaveis.
- [ ] Validar taxonomia e score com amostra real revisada por produto.

## Pos-beta

- [ ] Decidir sobre EAS Update e politica de canais/rollback.
- [ ] Migrar para New Architecture antes do proximo salto de SDK.
- [ ] Planejar backfill canonico somente apos amostrar dados reais.
- [ ] Decidir e remover ou reconstruir a camada antiga de agentes/pitch/entrevista.
- [ ] Avaliar notificacoes e lembretes somente com consentimento e metricas.

## Evidencias automaticas

```bash
npm ci
npm ci --prefix functions
JAVA_HOME=/caminho/do/jdk-21 PATH="$JAVA_HOME/bin:$PATH" npm run beta:check
```

O comando deve terminar com codigo zero. A auditoria de vagas gera relatorio
acionavel, mas problemas de conteudo continuam bloqueadores mesmo sem falhar o CI.
