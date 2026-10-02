# Revisão técnica do Hirly Apply

Data da revisão: 2026-08-03

## Resultado

O fluxo Hirly Apply está aprovado nos gates automatizados executáveis no repositório. Não foram encontrados bloqueadores. Todos os problemas classificados como altos foram corrigidos e receberam teste de regressão.

A validação cobre modelos, dados legados, recomendação determinística, geração do pacote, fila, máquina de estados, sessão externa, autenticação, Firestore, Storage, privacidade de analytics e observabilidade, retomada e fluxo crítico completo.

## Problemas encontrados

### Bloqueador

Nenhum.

### Alto — corrigidos

1. **Timeout do provedor de IA ausente.** Uma requisição pendurada podia ocupar quase todo o tempo da Cloud Function. O handler agora encerra a chamada após 20 segundos, aborta o `fetch`, libera a lease de quota e registra somente a categoria `provider_timeout`.
2. **Mensagem de erro bruta em observabilidade.** Erros do provedor, validação ou Firestore poderiam incluir respostas, trechos profissionais ou outros dados pessoais no Sentry/Cloud Logging. O cliente agora envia apenas nome/código categórico; logs de Functions não incluem mensagem bruta, UID, resposta, prompt ou conteúdo do currículo.
3. **Formulário externo sem transporte seguro.** URLs `http://` eram aceitas para fluxos que podem envolver e-mail, telefone e currículo. Novas vagas publicadas, sessões assistidas e abertura pelo app agora exigem HTTPS e rejeitam credenciais embutidas.
4. **Gate incompleto da jornada crítica.** Não havia um único teste cobrindo preparação, aprovação da revisão correta, início externo, confirmação e deduplicação do envio. O fluxo completo agora é exercitado com persistência transacional simulada.
5. **Empresa corrompida em duas cópias da vaga B3.** O campo `company` continha a modalidade “Híbrido” no CSV e no JSON. A evidência do título e do domínio oficial permitiu corrigir para “B3” sem inferir informação externa. A auditoria passou de dois críticos para zero.

### Médio — corrigidos

1. **Ações apenas visuais na tela externa.** Botões de copiar, checklist, currículo, motivos e ações finais receberam papéis, rótulos e estados de acessibilidade.
2. **Cobertura de qualidade da IA fora do gate Jest.** As fixtures de proveniência, contradição, segurança de vaga e currículo agora rodam como teste de regressão e bloqueiam falhas de severidade alta ou bloqueadora.

### Médio — pendentes

1. **App Check não é obrigatório em todas as callables do Apply.** Autenticação, validação estrita, caminhos derivados do UID e regras backend-only já limitam acesso, mas App Check reduziria abuso com token de autenticação roubado. A ativação deve ser feita por ambiente depois de registrar Android/iOS/Web para não interromper o beta.
2. **Moderação semântica ampla de saída.** Há schema estrito, prompts de não discriminação, red flags de vaga, proveniência e denúncia, mas não existe classificador abrangente de conteúdo inadequado para toda saída do provedor. O risco é reduzido porque IA não envia candidatura nem decide a triagem; conteúdo gerado continua editável e revisável.
3. **E2E em aparelho real.** Loading, vazio, erro, cache offline, retomada por `AppState` e acessibilidade básica possuem testes lógicos/smoke, mas gestos, leitores de tela e interrupção real de rede ainda exigem roteiro manual em iOS e Android.
4. **Catálogo legado em quarentena.** Os 151 registros de `data/` ainda somam 794 erros de schema/atualização e 137 avisos. Nenhum é considerado descobrível pelo pipeline atual (`reachable: 0`), portanto não chega ao Hirly Apply; a migração/recuração desse acervo continua pendente.

### Baixo — pendentes

1. **Observabilidade sem correlação por usuário.** A remoção de UID dos logs aumenta privacidade, mas reduz investigação individual. Preferir trace técnico temporário e rotativo, nunca restaurar PII em logs.
2. **Compatibilidade HTTP legada.** Documentos antigos com URL HTTP continuam legíveis no Firestore; a abertura é bloqueada. A curadoria deve migrar ou retirar essas vagas.

## Cobertura por área

| Área | Evidência principal |
|---|---|
| Isolamento entre usuários | Emulator Rules e handlers usando exclusivamente `request.auth.uid` |
| Validação e dados incompletos | Validadores TypeScript estritos e mappers legados |
| Duplicatas | recomendações, lote, geração com lease, sessão e envio idempotentes |
| Consistência de estados | máquina de estados e revisão/`approvedRevision` |
| Alucinação e proveniência | claims sem fonte descartados; baixa confiança vira pendência |
| Contradição | eval de veredito versus score determinístico |
| Falha/timeout/parcial de IA | fallback por seção, erro público estável e timeout de 20 s |
| Vaga expirada/pacote antigo | aprovação e início externo bloqueados; revisão antiga abortada |
| Segurança de dados | Firestore/Storage no emulador, HTTPS, logs categóricos e analytics allowlist |
| Offline/retomada | cache Firestore, estado local persistido e confirmação após retorno |
| Acessibilidade | papéis, rótulos, estados de checkbox/radio e regiões de loading |

## Testes adicionados nesta revisão

- timeout de provedor, liberação de quota e log sem UID/conteúdo;
- sanitização de exceções e allowlist do contexto de monitoramento;
- gate das fixtures de IA para proveniência, contradição, currículo e segurança;
- revisão antiga não aprova pacote atualizado;
- jornada completa até um único envio confirmado;
- isolamento de sessão externa por UID;
- vaga expirada não inicia sessão;
- formulário HTTP não inicia sessão e não valida no cliente;
- regra do Firestore impede publicar nova vaga com `applyUrl` HTTP;
- semântica básica de acessibilidade nas telas críticas.

## Gates executados

- `npm run check` — scanner de segredos, TypeScript, ESLint, testes, build do website e Expo Doctor;
- `npm run test:rules:emulator` — 29/29 testes de Auth, Firestore e Storage em projeto demo;
- `npm run jobs:audit` — zero críticos e zero vagas legadas alcançáveis pelo feed.

O `npm run check` concluiu com 174/174 testes, build Vite aprovado e Expo Doctor 18/18.

Os emuladores usaram um JRE 21 temporário porque o Mac não possui Java instalado. O CI já usa `actions/setup-java@v4`, portanto o gate permanece reproduzível sem alteração no sistema do desenvolvedor.

## Critério de prontidão

O código está pronto para homologação interna. Antes de liberar candidatura assistida ao público, executar o roteiro manual em um iPhone e um Android, ativar App Check de forma gradual e acompanhar `provider_timeout`, `external_application_failed` e erros de validação sem adicionar PII aos logs.
