# App Check - Acoes Manuais

O backend esta preparado para exigir e consumir tokens App Check, mas o
enforcement permanece desligado ate a configuracao nativa ser concluida. Expo Go
nao e o ambiente de producao para atestacao nativa.

## Desenvolvimento

1. Registrar os apps iOS e Android corretos em Firebase Console > App Check.
2. Adotar um Expo development build com os modulos nativos de App Check. A
   integracao deve usar `@react-native-firebase/app` e
   `@react-native-firebase/app-check`, ou uma ponte equivalente revisada, porque
   o app atual usa o Firebase Web SDK.
3. Configurar o provider `debug` somente nos builds de desenvolvimento.
4. Gerar um token debug no Console, guardá-lo no secret store do EAS/CI e nunca
   em `EXPO_PUBLIC_*`, `app.json`, `eas.json` versionado ou codigo-fonte.
5. Gerar novamente o development client e confirmar que a callable recebe
   `request.app`.

## Producao

1. Configurar App Attest com fallback para DeviceCheck no iOS.
2. Configurar Play Integrity no Android e vincular o projeto Google Play.
3. Criar builds internos assinados e observar metricas de requisicoes validas e
   invalidas no Console antes do enforcement.
4. Implantar `callAiFeature` com `AI_ENFORCE_APP_CHECK=true` e as callables do
   Hirly Apply com `APPLY_ENFORCE_APP_CHECK=true` somente depois que todos os
   builds beta enviados possuirem App Check funcional.
5. Testar que build legitimo funciona e que chamada sem token recebe rejeicao.
6. Revogar tokens debug usados por pessoas ou dispositivos que sairem do beta.

## Atencao

- Ativar qualquer enforcement antes do novo build bloqueia os clientes atuais
  nas callables correspondentes.
- A migracao nativa exige novo binario; atualizacao OTA nao e suficiente.
- Nao foi feita configuracao no Console, EAS, Apple ou Google Play nesta tarefa.
