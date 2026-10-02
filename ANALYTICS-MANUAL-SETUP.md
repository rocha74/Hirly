# Analytics Manual Setup

O codigo do app esta preparado, mas contas, projetos, variaveis EAS e validacao
dos paineis dependem do proprietario. Nenhuma etapa abaixo foi executada em
servicos externos nesta tarefa.

## PostHog

1. Criar ou selecionar um projeto PostHog para o beta e escolher a regiao de
   dados apropriada.
2. Copiar somente o project token publico e o host de ingestao do projeto.
3. Criar no EAS, para `development`, `preview` e `production`:
   - `EXPO_PUBLIC_POSTHOG_API_KEY` como plaintext;
   - `EXPO_PUBLIC_POSTHOG_HOST` como plaintext;
   - `EXPO_PUBLIC_APP_ENV` com o ambiente correspondente.
4. Configurar retencao, acesso da equipe e exclusao de dados de acordo com a
   Politica de Privacidade revisada.
5. Manter autocapture de toques e session replay desativados no beta.
6. Abrir Live Events e validar a taxonomia de `docs/BETA-METRICS.md`, sem nome,
   e-mail, telefone, CV, prompt ou resposta de IA.

Exemplo de comando, substituindo o valor localmente sem registra-lo no Git:

```bash
eas env:create --name EXPO_PUBLIC_POSTHOG_API_KEY --environment development --visibility plaintext
```

## Sentry

1. Criar ou selecionar um projeto React Native no Sentry.
2. Criar no EAS:
   - `EXPO_PUBLIC_SENTRY_DSN` como plaintext;
   - `SENTRY_ORG` como plaintext;
   - `SENTRY_PROJECT` como plaintext;
   - `SENTRY_AUTH_TOKEN` com visibilidade `sensitive`.
3. O token deve ter apenas os escopos necessarios para release/source maps. Ele
   nunca deve usar prefixo `EXPO_PUBLIC_`, entrar em `.env` versionado ou no
   `app.json`.
4. Gerar um novo development build porque `@sentry/react-native` inclui codigo
   nativo. Expo Go nao valida crashes nativos nem o pipeline final de maps.
5. Com uma conta admin em build de desenvolvimento, usar a acao temporaria
   "Testar monitoramento" no painel admin. Confirmar no Sentry release,
   ambiente, plataforma, tela e somente o UID pseudonimo.
6. Criar um build EAS de preview e confirmar que o stack trace do teste esta
   simbolicado. Se falhar, revisar `SENTRY_ORG`, `SENTRY_PROJECT`,
   `SENTRY_AUTH_TOKEN` e `metro.config.js`.
7. Configurar alertas, membros, retencao e ambiente de producao. Manter Session
   Replay desativado.
8. Opcionalmente conectar Sentry e EAS no painel Expo depois da validacao.

## Firebase

1. Revisar e implantar a nova regra de `feedback` somente depois dos testes no
   projeto alvo:

```bash
firebase use <projeto-confirmado>
firebase deploy --only firestore:rules
```

2. Confirmar que candidato autenticado cria feedback, nao consegue consultar a
   colecao, e somente admins autorizados conseguem moderar.
3. Definir retencao e processo de atendimento para feedback com autorizacao de
   contato. O documento guarda UID, nao uma copia de nome ou e-mail.

## Criterios de liberacao

- Eventos de desenvolvimento chegam ao projeto nao produtivo.
- O teste do Sentry chega com source map e sem PII.
- Logout separa a identidade da conta seguinte.
- Feedback passa pelas Rules implantadas.
- Dashboards de funil, D1/D7, candidaturas, IA e crash-free sessions foram
  revisados com dados de teste antes de receber candidatos reais.
