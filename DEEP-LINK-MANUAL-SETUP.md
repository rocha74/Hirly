# Deep Link Manual Setup

O app aceita somente:

- `hirly://v/{jobId}`;
- `https://hirly.app/v/{jobId}`;
- `https://www.hirly.app/v/{jobId}`.

O codigo e os templates estao preparados, mas a associacao dos dominios depende
das contas de assinatura e da hospedagem do proprietario. Nenhum Team ID,
certificado ou fingerprint foi inventado.

## Valores obrigatorios

### Apple

1. Obter o Apple Team ID em Apple Developer > Membership Details ou na conta
   usada pelo EAS Credentials.
2. Confirmar que o App ID `com.hirly.app` pertence ao time correto e possui a
   capability Associated Domains.
3. Substituir o marcador no template
   `docs/deep-link-hosting/.well-known/apple-app-site-association` pelo Team ID.

O `appID` final deve ter o formato `TEAM_ID.com.hirly.app`. O Team ID nao e o
bundle identifier e nao deve ser estimado.

### Android

1. Gerar ou selecionar a chave de assinatura do perfil que sera distribuido.
2. Obter o SHA-256 com `eas credentials -p android` para a chave do EAS.
3. Depois do primeiro upload, obter tambem o fingerprint de Play App Signing em
   Google Play Console > Setup > App integrity > App signing.
4. Substituir o marcador em
   `docs/deep-link-hosting/.well-known/assetlinks.json`. Se desenvolvimento,
   EAS e Play usarem certificados diferentes, incluir todos os fingerprints
   realmente utilizados.

## Hospedagem

Hospedar os dois arquivos, sem extensao adicional, em ambos os hosts:

```text
https://hirly.app/.well-known/apple-app-site-association
https://hirly.app/.well-known/assetlinks.json
https://www.hirly.app/.well-known/apple-app-site-association
https://www.hirly.app/.well-known/assetlinks.json
```

Requisitos:

- HTTPS valido;
- resposta `200` sem login;
- `Content-Type: application/json`;
- nenhum redirecionamento entre `hirly.app` e `www.hirly.app`;
- corpo igual ao template depois de substituir os marcadores;
- AASA sem extensao `.json` e com menos de 128 KB.

Verificacao de headers:

```bash
curl -i https://hirly.app/.well-known/apple-app-site-association
curl -i https://hirly.app/.well-known/assetlinks.json
curl -i https://www.hirly.app/.well-known/apple-app-site-association
curl -i https://www.hirly.app/.well-known/assetlinks.json
```

## Testes iOS

1. Publicar o AASA correto antes de gerar o build.
2. Gerar e instalar um novo build EAS em aparelho real.
3. Enviar `https://hirly.app/v/{ID_REAL_ATIVO}` por Mensagens, Mail ou Notas e
   tocar no link. Digitar na barra do Safari nao e um teste confiavel.
4. Repetir com `www.hirly.app`, app fechado, em background e aberto.
5. Testar deslogado e com onboarding incompleto; o detalhe deve abrir depois da
   conclusao do fluxo.
6. Para alteracoes no AASA, remova/reinstale o app ou gere nova versao, pois o
   iOS nao atualiza a associacao com frequencia.

## Testes Android

```bash
adb shell pm get-app-links com.hirly.app
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://hirly.app/v/ID_REAL_ATIVO" com.hirly.app
adb shell am start -W -a android.intent.action.VIEW \
  -d "https://www.hirly.app/v/ID_REAL_ATIVO" com.hirly.app
```

Confirmar estado `verified` para os dois hosts e repetir com app encerrado,
background, aberto, deslogado e em onboarding.

## Custom scheme

O scheme exige build nativo; nao usar Expo Go como validacao final.

```bash
npx uri-scheme open "hirly://v/ID_REAL_ATIVO" --ios
npx uri-scheme open "hirly://v/ID_REAL_ATIVO" --android
```

Tambem testar ID inexistente, vaga pausada, vaga expirada, rota extra, host
externo e ID com caracteres invalidos.

## Backend

Implantar `resolveJobLink` junto das Functions depois de confirmar o projeto:

```bash
firebase use <PROJETO_CONFIRMADO>
firebase deploy --only functions:resolveJobLink
```

A callable exige Authentication e retorna somente disponibilidade e motivo de
encerramento. Ela nao entrega conteudo de drafts ao aplicativo.
