# Hirly Apply — fundação da candidatura automática

Data: 2026-09-09

## Veredito

A fundação de dados e segurança existe, mas nenhum envio automático foi
implementado. O código desta fase não integra ATS, não publica Functions e não
altera a interface.

## Contratos

O schema `2026-09-09` adiciona quatro agregados:

1. `ProviderApplicationForm`: snapshot do formulário informado pelo provedor,
   com IDs externos, tipos, opções, obrigatoriedade, limites, documentos,
   versão e fingerprint SHA-256.
2. `ApplicationConsent`: registro imutável ligado à vaga, empresa, destino,
   provedor, revisão e fingerprint do pacote, formulário, currículo, anexos,
   respostas, payload, texto de consentimento e horário da aprovação.
3. `ApplicationSubmissionAttempt`: estado interno de uma tentativa, canal,
   chave de idempotência, contagem, fingerprints, comprovante e próxima ação.
4. `ApplicationSubmissionProjection`: visão sanitizada que o aplicativo pode
   ler, sem payload, respostas, paths de Storage ou erro interno.

Os canais possíveis são `official_api` e `manual_assist`. Os estados de uma
tentativa são `created`, `submitting`, `submitted`, `unknown` e `failed`.

## Invariantes do backend

- Formulário e consentimento têm fingerprints recalculados pelo backend.
- O consentimento nasce uma única vez e não pode ser alterado.
- API oficial exige formulário, vaga externa, pacote, currículo e payload
  identificados por fingerprints.
- Consentimento oficial só aceita respostas e documentos declarados pelo
  formulário e exige todos os itens obrigatórios.
- O snapshot de documento inclui path privado, geração do objeto no Storage,
  hash do conteúdo, versão, tamanho, tipo e horário da captura.
- `submitted` por API exige confirmação e protocolo ou referência do provedor.
- `submitted` assistido exige confirmação do candidato.
- Timeout de API vira `unknown`; esse estado só pode ir para `submitted` ou
  `failed` após reconciliação. Ele nunca volta diretamente para `submitting`.
- Campos que identificam consentimento, pacote, formulário, documentos,
  payload e idempotência não mudam durante a tentativa.
- Erros persistidos são códigos categóricos, sem resposta bruta do provedor.

## Firestore

```text
users/{uid}/providerApplicationForms/{formId}
users/{uid}/applicationConsents/{consentId}
users/{uid}/applicationSubmissionAttempts/{attemptId}
users/{uid}/applicationSubmissionProjections/{attemptId}
```

Os três primeiros caminhos não permitem leitura nem escrita pelo cliente. A
projeção permite somente leitura do proprietário. Toda escrita usa o Admin SDK
em uma futura Function. Os dados continuam sob `users/{uid}` e, portanto,
permanecem cobertos pela exclusão recursiva da conta.

## Compatibilidade

Os documentos existentes não são reescritos. O mapper de sessão externa legada
cria uma tentativa `manual_assist` sem inventar consentimento, formulário,
payload ou comprovante do provedor. Uma confirmação antiga do candidato pode
continuar como `submitted`, mas sua origem permanece `candidate`.

Não existe migração automática nesta fase. A aplicação futura deve migrar cada
registro de forma idempotente e preservar a sessão original até a validação.

## App Check

A correção do commit `15684db` foi preservada. O `BooleanParam` é resolvido para
um booleano real antes de configurar `enforceAppCheck` e
`consumeAppCheckToken`. A ativação por ambiente continua sendo uma etapa
operacional futura.

## Validação desta fase

- 9 testes específicos do backend e 5 testes de paridade entre app e backend.
- 30 testes das regras Firestore, incluindo os novos caminhos privados.
- Suíte completa: 212 testes aprovados.
- TypeScript, ESLint e build do site aprovados.
- O comando agregado `npm run check` ainda para em problemas anteriores e fora
  desta fase: duas detecções no script local de reset de vagas, alfa no ícone
  iOS e quatro versões patch do Expo.

## Próxima fase

Atualização de 2026-09-11: o novo canal de envio pela Hirly está planejado em
[HIRLY-APPLY-EMAIL-PROJECT.md](HIRLY-APPLY-EMAIL-PROJECT.md). Ele não altera nem
representa uma integração `official_api`; a primeira entrega é uma simulação
backend sem envio real. As observações de validação acima são históricas.

Criar respostas reutilizáveis com autorização explícita, versionar os bytes dos
documentos e implementar um provedor oficial falso que forneça o formulário.
Nenhuma integração real deve começar antes desses testes.
