# EAS Beta Setup

O repositorio possui perfis `development`, `preview` e `production` em
`eas.json`. Nenhum build, credencial ou submissao foi executado nesta tarefa.

## Decisoes atuais

- `development`: development client com distribuicao interna, app `Hirly Dev`.
- `preview`: staging fechado instalavel, app `Hirly Staging`; APK no Android e
  ad hoc no iOS.
- `production`: artefatos de loja, AAB explicito no Android e archive iOS na
  imagem EAS `latest` (validar Xcode 26+ no log do build).
- versao publica inicial: `1.0.0`; build iOS `1`; versionCode Android `1`.
- `runtimeVersion` usa a policy `appVersion`.
- build numbers sao geridos remotamente e incrementados pelo EAS.
- EAS Update ainda nao foi adotado: nao existe project ID/updates URL confirmado
  e nenhum canal foi declarado. Adotar exige uma decisao manual separada.

## Login e inicializacao

```bash
npm install --global eas-cli
eas login
eas whoami
eas init
eas build:configure
eas build:version:set
```

No `eas init`, selecionar a conta correta e confirmar o slug `hirly`. O comando
gravara `expo.extra.eas.projectId`; nao copiar ID de outro projeto. Em
`build:version:set`, sincronizar os ultimos numeros ja usados nas lojas, se
existirem.

Configurar as variaveis de cada ambiente conforme
`docs/ANALYTICS-MANUAL-SETUP.md` e `docs/FIREBASE-ENVIRONMENTS.md`. Staging e
produção exigem todas as variáveis `EXPO_PUBLIC_FIREBASE_*` do projeto correto.
Segredos como `SENTRY_AUTH_TOKEN` devem usar
visibilidade `sensitive`; nunca devem entrar no `env` do `eas.json`.

## Development build

```bash
eas build --platform android --profile development
eas build --platform ios --profile development
npx expo start --dev-client
```

O build iOS para aparelho exige conta Apple e dispositivo registrado.

## Preview fechado

```bash
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

O Android gera APK instalavel. O iOS usa distribuicao interna/ad hoc e exige
registrar os aparelhos dos testadores:

```bash
eas device:create
```

## TestFlight

Somente executar apos autorizacao explicita e revisao das credenciais:

```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production --latest
```

Depois, configurar grupo de testadores, informacoes de beta, compliance e
distribuicao no App Store Connect. O upload nao libera o build sozinho.

## Google Play Closed Testing

```bash
eas build --platform android --profile production
eas submit --platform android --profile production --latest
```

O perfil envia para o track `alpha` (closed testing) como draft. O perfil de
submit `preview` usa `internal`, tambem como draft. A primeira versao pode exigir
upload manual no Google Play Console antes que a API aceite submissao. No
console, revisar o closed track, paises, lista de testadores e publicar o draft.

## Rollback

Sem EAS Update, criar uma nova compilacao a partir de um revert validado; lojas
nao aceitam simplesmente reduzir `buildNumber` ou `versionCode`:

```bash
git revert <COMMIT_COM_PROBLEMA>
npm run check
eas build --platform all --profile production
eas submit --platform ios --profile production --latest
eas submit --platform android --profile production --latest
```

Se EAS Update for adotado futuramente e o update afetado nao mudar codigo
nativo, o rollback oficial sera:

```bash
eas update:rollback --channel production
```

Nao executar esse comando antes de `eas update:configure`, configurar canais e
validar a runtime correspondente.

## Nova versao

1. Alterar `expo.version` no `app.json` para a nova versao publica.
2. Se houve dependencia nativa ou mudanca de app config, sempre gerar novos
   binarios.
3. Executar:

```bash
npm ci
npm run check
npx expo export --platform ios --output-dir /tmp/hirly-ios-export
npx expo export --platform android --output-dir /tmp/hirly-android-export
eas build --platform all --profile production
```

4. Submeter somente com autorizacao. O EAS incrementara os numeros internos.

## EAS Update opcional

Para adotar depois de confirmar o projeto e a politica de rollback:

```bash
npx expo install expo-updates
eas update:configure
```

Somente depois adicionar canais `preview` e `production` aos perfis, criar novos
builds e testar updates no preview antes de publicar em producao.
