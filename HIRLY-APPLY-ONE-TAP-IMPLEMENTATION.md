# Hirly Apply — plano para candidatura em um toque

Data da auditoria: 2026-08-24

Fundação atualizada: 2026-09-09

Complemento de produto e execução em 2026-09-09:
`HIRLY-APPLY-PILOT-AND-PUBLIC-PLAN.md`. Revisão geral e correções:
`APP-REVIEW-2026-09-09.md`. Há um bloqueador de exclusão concorrente descrito em
`ACCOUNT-DELETION-LIFECYCLE-PLAN.md`. Dados de deploy citados abaixo são históricos;
a revisão atual não revalidou nem alterou o ambiente publicado.

Branch auditada: `codex/preparacao-piloto`

Commit-base: `e8f86fa`

## 1. Veredito direto

O Hirly já possui uma base sólida para preparar, revisar e acompanhar uma
candidatura. O envio por API oficial, porém, **não existe** no código nem no
ambiente Firebase publicado.

O caminho correto não é reconstruir o Apply. É manter pacote, proveniência,
fila, revisão e modo assistido, acrescentando um canal de envio oficial no
backend. Uma automação de navegador seria frágil e não faz parte deste plano.

## 2. Escopo desejado

```text
Hirly prepara o pacote
        |
        v
mostra resumo e somente as pendências
        |
        v
candidato toca em “Aprovar e enviar”
        |
        +-------------------------------+
        |                               |
        v                               v
API oficial disponível          API oficial indisponível
backend envia                    modo assistido atual
        |                               |
        v                               v
protocolo confirmado             candidato conclui no site
        |                               |
        +---------------+---------------+
                        v
              histórico da candidatura
```

O toque final deve aprovar e iniciar o envio na mesma ação visual. Internamente,
aprovação e envio continuam sendo operações separadas e auditáveis.

## 3. Evidências da auditoria

Nesta análise:

- **Fato**: confirmado no código, nos testes ou no projeto Firebase consultado.
- **Inferência**: conclusão técnica baseada nesses fatos.
- **Incerteza**: depende de acesso ou informação externa ainda não disponível.

### Validação executada

- `npm run test:functions`: **81 testes aprovados**.
- Testes focados de domínio, contrato, fila e adaptador: **23 aprovados**.
- `firebase functions:list --project job-swipe-o678qx`: somente
  `callAiFeature` e `deleteMyAccount` estão publicadas.
- Nenhuma alteração funcional ou deploy foi realizado nesta auditoria.

## 4. O que já existe

### 4.1 Preparação do pacote — existe e deve ser reutilizada

**Fato:** `functions/shared/applicationPackage.js` já:

- coleta fatos do perfil, currículo, fatos profissionais e respostas aprovadas;
- analisa requisitos obrigatórios e desejáveis;
- escolhe o currículo principal existente;
- gera resumo, sugestões, pitch, carta e respostas determinísticas;
- cria pendências quando não existe evidência;
- não gera pretensão salarial;
- registra fontes, confiança e necessidade de revisão;
- calcula fingerprint da vaga e da entrada;
- invalida aprovação quando o conteúdo muda.

O gerador atual é determinístico. Ele não usa IA generativa no Apply. Isso reduz
alucinação e custo, mas também limita a qualidade de textos personalizados.

### 4.2 Resumo e pendências — existem em grande parte

**Fato:** `ApplicationPlanScreen.tsx` já mostra primeiro:

- vaga, empresa e destino;
- estado do pacote;
- materiais preparados;
- quantidade de itens que exigem atenção;
- pendências e riscos bloqueantes;
- detalhes completos apenas quando o candidato abre a seção.

O fluxo sem pendências já evita leitura obrigatória de todas as seções. A tela
ainda usa a mensagem e o botão do modo assistido: “Aprovar e abrir site da
empresa”.

### 4.3 Aprovação — existe, mas não autoriza envio por API

**Fato:** `approveApplicationPackage`:

- exige autenticação;
- aceita uma revisão esperada;
- bloqueia pendências, baixa confiança e riscos sem confirmação;
- grava `approvedRevision` e `approvedAt`;
- invalida a aprovação após edição;
- salva respostas em `approvedAnswers`.

Na interface, aprovar e abrir o site já acontece com um toque. No domínio,
aprovar apenas confirma o pacote; não existe consentimento contendo provedor,
payload final, currículo, anexos e destino exatos.

### 4.4 Fila — existe e está bem protegida

**Fato:** `applicationQueue` já oferece:

- resumo persistido da vaga;
- estados de preparação, aprovação, sessão externa e conclusão;
- ação idempotente por `actionId`;
- aprovação individual e em lote;
- bloqueio de lote para dados sensíveis, baixa confiança, expiração e revisão
  divergente;
- cache local e recuperação de falha de leitura.

A aprovação em lote atual apenas aprova pacotes. Ela não envia candidaturas.

### 4.5 Respostas reutilizáveis — existem parcialmente

**Fato:** respostas aprovadas são gravadas em
`users/{uid}/approvedAnswers`. O gerador reutiliza como evidência somente
respostas escritas ou editadas pelo candidato (`generated: false`). Pretensão
salarial só é reutilizada quando foi informada e aprovada pelo candidato.

**Lacunas:**

- não existe tela para consultar, editar, expirar ou revogar essa memória;
- não existe opção explícita “usar em futuras candidaturas”;
- todas as respostas do pacote são persistidas após aprovação, inclusive as
  geradas, embora as geradas sejam ignoradas como evidência futura;
- o vínculo usa principalmente texto e ID interno, não o ID da pergunta do ATS;
- validade, escopo por empresa e versão da resposta não estão definidos.

### 4.6 Sessão externa e fallback — existem e devem permanecer

**Fato:** o único adaptador registrado é `GenericFormAdapter`, com modo
`manual_assist` e `canAutofill: false`.

O backend:

- valida pacote, revisão, vaga, URL HTTPS e currículo aprovado;
- cria uma sessão determinística por `{jobId}:{packageRevision}`;
- permite copiar campos e respostas e abrir o currículo;
- não recebe senha e não resolve CAPTCHA;
- cria a candidatura somente quando o candidato confirma que enviou no site.

Esse fluxo é o fallback correto para plataformas sem integração oficial.

### 4.7 Registro de candidatura — existe sem comprovante externo

**Fato:** após confirmação manual, o backend grava em
`users/{uid}/applications/{jobId}` e atualiza sessão, pacote, fila e interação.
Repetições são reconciliadas.

Esse registro prova apenas que o candidato confirmou o envio. Ele não contém:

- identificador da candidatura no provedor;
- protocolo externo;
- identificador da requisição;
- hash do payload enviado;
- resposta categorizada do provedor;
- estado “resultado desconhecido”.

### 4.8 Documentos — currículo principal existe; anexos não entram no Apply

**Fato:** o perfil permite até cinco PDFs adicionais em `supportingDocuments`,
mas pacote e sessão externa usam apenas o currículo principal em
`profile.cv.storagePath`.

Para envio oficial será necessário selecionar, aprovar e registrar os anexos
exatos enviados em cada candidatura.

### 4.9 Firebase local e ambiente publicado

**Fato:** o código local exporta callables de pacote, fila e sessão externa em
`functions/index.js`.

**Fato:** em 2026-08-24, o projeto `job-swipe-o678qx` publica somente:

- `callAiFeature`;
- `deleteMyAccount`.

Portanto, o Hirly Apply local não está operacional no backend publicado. Os
testes locais comprovam o domínio, não o ambiente real.

**Resolvido localmente:** o commit `15684db` passou a resolver
`APPLY_ENFORCE_APP_CHECK` para um booleano real antes de configurar as
callables. A ativação e a comprovação no projeto publicado continuam pendentes.

### 4.10 Segurança e exclusão

**Fato:** pacotes, respostas, fila, operações e sessões são somente leitura no
cliente. O backend escreve usando o UID autenticado. A exclusão de conta usa
`recursiveDelete` no documento do usuário e apaga o prefixo de Storage, cobrindo
esses dados privados.

**Lacuna:** `applications` continua com escrita permitida ao cliente por
compatibilidade legada. Registros originados de API oficial devem ser criados
somente pelo backend. Será necessária uma migração antes de tornar essa coleção
backend-only.

## 5. O que precisa mudar

### 5.1 Separar canal de conclusão

Cada candidatura precisa declarar um canal:

- `official_api`: envio e confirmação feitos pelo backend;
- `manual_assist`: conclusão pelo candidato no site externo.

O canal deve ser escolhido pelo backend conforme capacidade real do provedor,
nunca por uma promessa do frontend.

### 5.2 Registrar consentimento exato

O toque “Aprovar e enviar” deve criar um registro imutável contendo:

- candidato, vaga, empresa e destino;
- provedor e identificador externo da vaga;
- revisão e fingerprint do pacote;
- fingerprint do formulário do provedor;
- currículo e anexos escolhidos;
- IDs e hash das respostas;
- versão do texto de consentimento;
- data da aprovação.

Uma edição, troca de currículo, mudança da vaga ou alteração do formulário deve
invalidar o consentimento.

### 5.3 Conhecer o formulário antes de preparar

O pacote atual cria perguntas genéricas a partir da vaga. Isso não basta para
uma API real.

O adaptador oficial precisa buscar o formulário atual antes da aprovação e
fornecer:

- IDs estáveis das perguntas;
- tipo e opções de resposta;
- obrigatoriedade;
- limites de texto;
- anexos aceitos;
- versão ou fingerprint do formulário.

Antes do envio, o backend deve revalidar o formulário. Mudança relevante exige
nova revisão.

### 5.4 Criar adaptadores no backend

O contrato atual de adaptador está no aplicativo e proíbe envio final. Para API
oficial, deve existir um contrato separado no backend com operações equivalentes
a:

```text
supports(job)
fetchApplicationForm(job)
buildSubmission(package, form)
validateSubmission(payload)
submit(payload, idempotencyKey)
getSubmissionStatus(providerReference)
```

O primeiro adaptador deve ser falso e determinístico para testes. Um adaptador
real só deve ser implementado depois de obter documentação e credencial oficial.

### 5.5 Criar tentativa de envio persistente

Não é seguro tratar uma chamada externa como uma transação do Firestore. Deve
existir um agregado `ApplicationSubmissionAttempt`, separado da sessão manual,
com pelo menos:

- `providerId` e `mode`;
- revisão, fingerprints e hash do payload;
- chave de idempotência;
- estados `created`, `submitting`, `submitted`, `unknown` e `failed`;
- contagem de tentativas e próxima ação segura;
- identificador e protocolo do provedor;
- erro categórico, sem resposta bruta ou dados pessoais em logs;
- timestamps de aprovação, tentativa e confirmação.

Timeout após o envio deve resultar em `unknown`, não em nova tentativa imediata.
O sistema precisa consultar ou reconciliar o provedor antes de reenviar.

### 5.6 Evoluir o histórico e o comprovante

`applications/{jobId}` deve registrar, quando houver:

- origem `official_api` ou `manual_assist`;
- provedor;
- ID e protocolo externos;
- revisão aprovada;
- data confirmada pelo provedor;
- referência da tentativa de envio.

Não persistir token, payload completo nem resposta bruta do provedor no histórico.

### 5.7 Simplificar a interface por exceção

Para vagas suportadas por API, a tela rápida deve mostrar:

- vaga, empresa e provedor;
- currículo e anexos que serão enviados;
- quantidade de respostas preenchidas;
- somente pendências, respostas novas e riscos;
- aviso de que o envio normalmente não pode ser desfeito;
- botão “Aprovar e enviar”.

Detalhes e fontes permanecem disponíveis, mas recolhidos. Para vaga não
suportada, o CTA deve continuar deixando claro que abrirá o site externo.

### 5.8 Adiar envio em lote

Aprovação em lote já existe, mas envio em lote deve ficar fora da primeira
versão. Ele só deve ser considerado depois que o envio individual atingir o gate
de qualidade e cada vaga continuar visível na confirmação.

## 6. O que precisa ser criado

| Componente | Responsabilidade |
| --- | --- |
| `ProviderApplicationForm` | Snapshot tipado do formulário oficial. |
| `ApplicationConsent` | Aprovação imutável ligada ao conteúdo exato. |
| `ApplicationSubmissionAttempt` | Estado, idempotência, falha e reconciliação do envio. |
| Adaptador oficial no backend | Buscar formulário, validar, enviar e consultar status. |
| Adaptador falso | Exercitar todo o fluxo sem depender de serviço externo. |
| Orquestrador de envio | Revalidar pacote, vaga, formulário, currículo, anexos e consentimento. |
| Comprovante | Mostrar protocolo e resultado confiável ao candidato. |
| Estado `unknown` | Impedir duplicação quando a resposta externa for ambígua. |
| Gestão de respostas | Permitir reuso opcional, edição, expiração e revogação. |
| Feature flag e allowlist | Restringir integração real a contas internas. |
| Métricas do canal oficial | Medir sucesso, correção, duplicidade, latência e falhas. |

## 7. Riscos reais

### Bloqueadores

1. **Não há acesso comprovado a uma API de candidatura.** Sem parceria, token e
   ambiente de teste, não existe envio oficial para implementar.
2. **As Functions do Apply não estão publicadas.** O app real não consegue usar
   o backend local auditado.
3. **App Check ainda não foi comprovado no ambiente publicado.** A correção
   local existe, mas ativação por plataforma e validação operacional continuam
   pendentes.
4. **Formulário real desconhecido.** Preparar apenas pela descrição da vaga pode
   omitir perguntas obrigatórias.

### Altos

1. Timeout depois de o provedor receber a candidatura pode causar duplicação.
2. O provedor pode mudar perguntas entre preparação e envio.
3. Anexos extras podem ser enviados sem terem sido incluídos na aprovação.
4. Respostas antigas podem ficar incorretas ou inadequadas para outra empresa.
5. A coleção legada `applications` ainda aceita escrita do cliente.
6. Não há E2E em sandbox oficial, aparelho real ou carga concorrente.

### Médios

1. Contratos de estado duplicados em JavaScript e TypeScript aumentam risco de
   divergência.
2. O gerador determinístico pode produzir texto correto, mas genérico.
3. Novas leituras de formulário e tentativas externas elevam custo e superfície
   de observabilidade.
4. Termos, privacidade, retenção e operadores externos exigirão revisão jurídica.

## 8. Dependências externas

### Obrigatórias para integração real

- autorização formal do provedor/ATS;
- token com escopo mínimo;
- ambiente sandbox ou conta de teste;
- documentação oficial dos endpoints e erros;
- identificador externo confiável de vaga;
- política de idempotência ou consulta de candidatura;
- limites de uso e contato de suporte;
- armazenamento do token no Secret Manager.

### Obrigatórias antes de usuários reais

- App Check registrado e validado por plataforma;
- regras, índices e Functions comprovados no projeto correto;
- observabilidade e alertas sem PII;
- termos e Política de Privacidade revisados profissionalmente;
- política de retenção e exclusão incluindo o provedor;
- testes em builds assinados de iOS e Android.

**Incerteza:** o repositório não prova que a Hirly tenha parceria, credencial,
sandbox ou direito contratual de enviar candidaturas em qualquer ATS.

## 9. Ordem recomendada de implementação

1. **Fechar pré-condições:** confirmar o primeiro provedor e acesso oficial.
2. **Comprovar a base operacional:** ativar App Check gradualmente, realizar
   deploy interno e registrar evidência do projeto Firebase, sem enviar a um
   provedor real.
3. **Evoluir o domínio:** canal de conclusão, formulário, consentimento e
   tentativa de envio, com migração compatível.
4. **Criar adaptador falso:** cobrir sucesso, duplicidade, timeout, falha e
   resultado desconhecido.
5. **Integrar formulário ao pacote:** preparar respostas usando IDs e regras
   reais, mostrando somente exceções.
6. **Criar “Aprovar e enviar”:** uma ação visual, aprovação imutável e chamada
   segura ao orquestrador.
7. **Implementar comprovante e recuperação:** protocolo, histórico e
   reconciliação de `unknown`.
8. **Integrar um único provedor oficial:** feature flag, allowlist e sandbox.
9. **Manter e testar o modo assistido:** fallback explícito para toda vaga não
   suportada.
10. **Endurecer dados e segurança:** memória de respostas, anexos, Rules,
    exclusão, retenção, métricas e alertas.
11. **Executar gate interno em aparelhos reais:** só então considerar usuários
    externos.
12. **Avaliar lote depois:** nunca antes do envio individual ser confiável.

## 10. Gate mínimo para liberar um provedor

Estes são critérios recomendados, não resultados já alcançados:

- 100% dos envios ligados à revisão, vaga, formulário e anexos aprovados;
- zero resposta sensível inferida;
- zero candidatura duplicada nos testes de repetição e timeout;
- todo sucesso com identificador ou protocolo verificável;
- nenhum estado `submitted` baseado apenas em expectativa do cliente;
- falha ambígua preservada como `unknown` até reconciliação;
- pelo menos 95% de sucesso técnico nos casos elegíveis do sandbox;
- fallback manual funcional quando a API não suporta a vaga;
- exclusão de conta cobrindo novos dados;
- revisão jurídica e operacional concluída.

## 11. Conclusão

A base atual evita os erros mais graves de proveniência, revisão antiga e
duplicidade interna. Isso reduz bastante o trabalho futuro.

O ponto difícil não é gerar texto nem desenhar o botão. É obter acesso oficial,
ler o formulário real, controlar uma chamada externa não transacional e provar o
resultado sem duplicar candidatura. Sem essas quatro condições, “Aprovar e
enviar” seria apenas uma promessa visual.

## 12. Estado da fundação automática

Em 2026-09-09 foram definidos, sem deploy ou integração real:

- `ProviderApplicationForm` com perguntas e documentos versionados;
- `ApplicationConsent` imutável e ligado ao conteúdo exato;
- `ApplicationSubmissionAttempt`, incluindo `unknown` e idempotência;
- snapshots de currículo e anexos com hash e geração do Storage;
- projeção sanitizada para o aplicativo;
- mapper conservador para sessões manuais legadas;
- caminhos Firestore exclusivos do backend.

Detalhes: `HIRLY-APPLY-AUTOMATIC-FOUNDATION.md`.
