# Beta Rollback Plan

## Gatilhos

Interromper a distribuicao diante de acesso indevido a dados, exclusao incompleta,
segredo exposto, crash recorrente no fluxo principal, custo de IA fora do limite,
vagas fraudulentas publicadas ou regressao que marque candidatura sem confirmacao.

## Contencao imediata

1. Pausar o track fechado nas lojas e remover links de convite.
2. Desativar features de IA por `AI_ENABLED_FEATURES`; se necessario, desabilitar
   a Function afetada sem expor o motivo tecnico ao usuario.
3. Pausar vagas afetadas e imports. Preservar logs sem copiar PII para tickets.
4. Para incidente de credencial, revogar primeiro, depois investigar e recriar.
5. Para Rules inseguras, implantar a ultima versao testada e repetir a suite no
   projeto alvo antes de reabrir acesso.

## Reversao de codigo

Sem EAS Update, uma regressao nativa ou JS exige novo build com numero superior:

```bash
git revert <COMMIT_COM_PROBLEMA>
npm ci
npm ci --prefix functions
npm run beta:check
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

Testar o fluxo afetado e somente entao distribuir o novo preview. Nunca reduzir
`buildNumber` ou `versionCode`, nem reutilizar runtime incompativel.

## Firebase

Antes de qualquer deploy, selecionar explicitamente o projeto e guardar a versao
implantada de Rules, indices e Functions. Reverter um componente por vez:

```bash
firebase use <PROJETO_CONFIRMADO>
firebase deploy --only firestore:rules,storage
firebase deploy --only functions:<FUNCAO_CONFIRMADA>
```

Indices nao devem ser apagados durante um incidente sem analisar consultas ativas.
Restauracao de dados exige backup confirmado, revisao de escopo e trilha de
auditoria; nunca reimportar um dump sobre producao sem revisao.

## Validacao e comunicacao

- Executar o caso que detectou a falha, `npm run beta:check` e o smoke manual.
- Verificar PostHog/Sentry, custos, regras e logs sem PII antes da retomada.
- Documentar causa, janela, versoes, usuarios potencialmente afetados e medidas.
- Acionar o processo juridico de incidente/LGPD quando aplicavel.

EAS Update nao esta configurado. Nao usar `eas update:rollback` ate existir
project ID, canais, politica de runtime e teste previo no canal de preview.
