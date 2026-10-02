# Ambientes Firebase e builds Hirly

Data: 2026-09-09

## Regra

Cada ambiente usa um projeto Firebase e identificadores nativos próprios:

| Ambiente | Firebase | iOS | Android |
| --- | --- | --- | --- |
| development | `job-swipe-o678qx` | `com.hirly.app.dev` | `com.hirly.app.dev` |
| staging | projeto exclusivo | `com.hirly.app.staging` | `com.hirly.app.staging` |
| production | projeto exclusivo | `com.hirly.app` | `com.hirly.app` |

O projeto atual é somente de desenvolvimento. Staging e produção rejeitam sua
configuração no aplicativo e no site. `app.config.js` separa nome, scheme e IDs
nativos. `eas.json` associa `preview` a staging.

Somente production registra os links HTTPS `hirly.app`/`www.hirly.app`.
Development e staging usam schemes próprios, sem reivindicar domínios públicos.
O site carrega Firebase apenas ao solicitar exclusão: páginas públicas não
quebram por falta da configuração, mas excluir ainda exige os valores corretos.

## Estado externo

Na conta Google conectada existe apenas `job-swipe-o678qx`. Projetos staging e
production não foram criados porque os IDs globais e a conta de faturamento são
decisões externas permanentes. Não usar placeholders em `.firebaserc`.

## Criação manual

1. Escolher os dois IDs globais e a conta Google proprietária.
2. Criar os projetos no Firebase Console e ativar o plano necessário.
3. Registrar um app Web em cada projeto e copiar apenas sua configuração
   pública.
4. Ativar Authentication, Firestore, Storage e Functions separadamente.
5. Definir região, orçamento, alertas e IAM de privilégio mínimo.
6. No repositório, adicionar aliases sem trocar o default de desenvolvimento:

```bash
firebase use --add
```

7. Configurar no EAS os valores `EXPO_PUBLIC_FIREBASE_*` para os ambientes
   `preview` e `production`. Os modelos estão em `.env.staging.example` e
   `.env.production.example`.
8. Configurar `VITE_APP_ENV` e `VITE_FIREBASE_*` no provedor do site.
9. Implantar primeiro em staging, validar duas contas isoladas e somente depois
   preparar produção.

Chaves administrativas, tokens do ATS e chaves de IA nunca usam prefixo
`EXPO_PUBLIC_` ou `VITE_`.

## Gates

Antes de qualquer build:

```bash
npm run beta:check
EXPO_PUBLIC_APP_ENV=staging npx expo config --type public
EXPO_PUBLIC_APP_ENV=production npx expo config --type public
```

Os dois últimos comandos também exigem as seis variáveis públicas Firebase do
ambiente correspondente. Qualquer ausência ou uso do projeto de desenvolvimento
interrompe o app.
