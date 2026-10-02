# Hirly Apply — candidatura enviada pela Hirly

Decisão: 2026-09-11. Canal `email_application`, separado de `official_api` e `manual_assist`.

## Resultado pretendido

Hirly prepara mensagem e documentos; o candidato revisa o resumo, resolve pendências e toca em **Aprovar e enviar**. A empresa recebe um e-mail identificado como Hirly, em nome do candidato. `Reply-To` aponta para o e-mail verificado do candidato. Não acessaremos sua caixa postal.

Somente vagas cuja publicação oficial aceite candidaturas por e-mail, com destinatário confirmado pela curadoria. Não adivinhar endereços, contornar um ATS obrigatório nem enviar candidaturas em massa. Aprovação é individual, nunca autorização genérica para qualquer vaga.

## Estado implementado nesta entrega

- Módulo puro de preparação, aprovação vinculada ao conteúdo e montagem do payload com Reply-To.
- Validação de vaga, rota verificada/temporária, identidade, documentos exigidos e limites.
- Snapshot aprovado inclui caminho privado, geração do objeto, tamanho e SHA-256; montagem exige os mesmos bytes.
- Estados `created`, `submitting`, `accepted`, `unknown`, `failed`. Timeout não autoriza repetir envio.
- Caminhos Firestore privados; somente projeção pode ser lida pelo candidato. Snapshot Storage bloqueado ao cliente pelas regras existentes.
- Simulação local: `npm run apply:email:demo`. Usa dados fictícios e endereços `.invalid`; não faz chamadas externas.

**Não existe envio real, callable, persistência de consentimento, fila ou tela deste canal ainda.** O congelamento em memória e hashes não substituem autorização e imutabilidade no banco. Os campos de entrada são contratos normalizados do servidor; ainda falta mapear os modelos atuais. `scanStatus` deve vir de scanner confiável ainda não implementado; a simulação usa um arquivo fictício, não comprova análise de PDFs.

Os modos antigos não foram alterados. Não houve deploy. A configuração de App Check permanece intacta.

## Implementação restante, em ordem

### 2. Ciclo de vida e documentos

Resolver primeiro a corrida de exclusão descrita em ACCOUNT-DELETION-LIFECYCLE-PLAN.md: operações em andamento não podem recriar dados nem iniciar envio após bloqueio da conta. Criar barreira transacional, cancelamento de fila e limpeza de documentos temporários. O que já foi transmitido não pode ser recolhido do destinatário; informar esse limite.

Criar snapshots com geração fixa e criação sem sobrescrita, validação estrutural do PDF, scanner e limites de tamanho. Não confiar em flags do perfil editável. Exigir e-mail verificado pelo Firebase Auth. Definir retenção mínima de consentimentos/comprovantes e limpeza de anexos; revisar textos de privacidade antes de uso real.

### 3. Backend persistente e aprovação

Criar rotas por vaga exclusivamente via ferramenta administrativa protegida: endereço, fonte oficial, evidência, empresa, assunto exigido, documentos, revisão e validade. A validação humana é necessária: ter um link HTTPS não comprova que o destinatário aceita candidaturas.

Criar callables autenticadas com App Check usando a configuração existente. O aplicativo envia IDs e o fingerprint esperado, nunca remetente, destino, flags de verificação ou payload arbitrário. O backend carrega os registros, deriva UID e horário, cria a prévia e grava consentimento imutável.

Persistir uma outbox com unicidade por candidato/vaga, aprovação e tentativa na mesma transação. Dois toques devem retornar a mesma aprovação/tarefa, sem novo timestamp/idempotency key. Vincular consentimento aos bytes, mensagem, destino e revisão exatos. Mudanças exigem nova revisão e aprovação; bloquear duplicação de candidatura já enviada.

Criar projeções mínimas para o app, sem paths privados ou erros internos. Integrar o histórico existente sem classificar e-mail como API oficial de recrutamento. Testar acessos cruzados e não permitir que registros legados editáveis autorizem o envio.

### 4. Transporte e recuperação

Escolha técnica inicial: Resend, substituível. Implementar adaptador server-only, secret, remetente verificado, flag desligada por padrão, ambientes separados e allowlist de destinatários internos no staging. Revalidar conta, remetente, rota, vaga, consentimento e documentos antes de enviar.

Worker com lease, limites por usuário/destinatário e bloqueio global de emergência. Persistir a tentativa antes da chamada; depois, ID do provedor e resultado. Falha inequívoca pode ser tratada; timeout ou crash após chamada vira `unknown`, sem reenvio cego. Deduplicação durável é nossa: a janela do provedor é de apenas 24 horas. Fora dela, reconciliar antes de qualquer nova tentativa; caso insolúvel, revisão manual, nunca afirmar envio ou falha sem evidência.

### 5. Comprovantes e eventos

Receber webhooks com assinatura validada, deduplicação, processamento fora de ordem e vínculo ao ID do provedor. Não incluir CV, texto ou e-mails completos nos logs de telemetria. Tratar rejeição, bounce, reclamação e supressão. Separar estado da tentativa do estado de entrega.

`accepted` significa aceito pelo serviço de e-mail; entrega exige evento próprio. Entregue não significa lido, candidatura aceita, entrevista ou contratação. Não usar pixel para inferir sucesso. Resposta da empresa chega ao candidato; resultado seletivo será informado por ele no app, não detectado automaticamente.

### 6. UX e liberação

Prévia com empresa, destinatário, remetente Hirly, endereço de resposta, mensagem e anexos acessíveis. Mostrar pendências necessárias, botão Aprovar e enviar e opção voltar. Exibir o consentimento versionado no ato, sem checkbox pré-marcado. Mudança material invalida aprovação. Mostrar recibo com horário e status honesto; casos sem rota usam conclusão assistida.

Primeiro testar somente contas/caixas controladas: concorrência, clique duplo, perda de rede, crash, webhook duplicado, exclusão concorrente, documento alterado, destinatário revogado e aprovação vencida. Conferir bytes recebidos e Reply-To em uma caixa real de teste. Só liberar vagas reais após esses testes e autorização de deploy. Começar com poucas vagas verificadas e limites baixos; acompanhar falhas e tempo poupado, não apenas número de envios.

## Ações manuais externas

Não são necessárias para rodar a simulação. Antes dos testes reais:

1. Escolher um domínio que você controla e criar uma conta no Resend. Não é preciso contratar plano pago nesta etapa.
2. Cadastrar um subdomínio de envio. No painel DNS do domínio, adicionar exatamente os registros solicitados pelo provedor e aguardar verificação. Não apagar registros existentes nem criar SPF duplicado. Revisar DMARC sem enfraquecer política existente. Escolher o remetente nesse domínio.
3. Criar a API key e guardá-la somente no Secret Manager do projeto de staging como `RESEND_API_KEY`, quando o adaptador estiver pronto. Nunca colar no chat, no Git ou em variável `EXPO_PUBLIC_*`. O vínculo da Function e o secret de webhook serão configurados na fase de transporte.
4. Disponibilizar uma caixa de teste controlada e links oficiais de vagas que explicitamente aceitem e-mail. Confirmar acesso administrativo ao domínio e ao Firebase de staging.

Configuração DNS e credenciais não substituem as etapas de código acima. Não habilitar envio real só porque o domínio foi verificado.

## Referências verificadas

- [API de envio e campos do e-mail](https://resend.com/docs/api-reference/emails/send-email).
- [Idempotência do Resend: janela de 24 horas](https://resend.com/docs/dashboard/emails/idempotency-keys).
- [Configuração de domínio](https://resend.com/docs/dashboard/domains/introduction).

## Verificação

Testes específicos: `node --test functions/test/emailApplication.test.js`.
Simulação: `npm run apply:email:demo`.
Regressão e regras: `npm run beta:check` (requer Java compatível com os emuladores).

Execução local em 2026-09-11: `beta:check` aprovado, incluindo suíte completa,
33 testes de regras, TypeScript, lint, auditoria de vagas, build do site e
18 verificações do Expo Doctor. Após endurecer a ordenação dos fingerprints,
lint e os 138 testes de Functions passaram novamente. Simulação confirmou
`sent: false`. Esses testes não validam entregabilidade nem substituem os
testes reais controlados previstos acima.
