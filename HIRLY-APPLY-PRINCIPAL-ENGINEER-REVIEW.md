# Hirly Apply — revisão de lançamento do engenheiro principal

Data do gate: 2026-08-03

## Decisão

**Não aprovado para usuários reais ou beta público.** O código local está apto para homologação interna e testes controlados, mas três bloqueadores impedem o lançamento: documentos e processos de privacidade ainda não aprovados, ausência de um catálogo real curado e falta de evidência do ambiente de produção/builds assinados.

O caminho crítico é coberto por testes: recomendar, preparar, revisar, aprovar, abrir a sessão externa e registrar uma única candidatura. Isso ainda não prova o critério de sucesso com dados e aparelhos reais.

## Respostas diretas

### O que pode causar perda de confiança?

- recomendações ruins ou uma seção vazia devido ao catálogo atual;
- atribuir à IA textos que, nesta versão, são produzidos por regras determinísticas;
- abrir uma vaga, currículo ou destino diferente do que foi aprovado;
- sugerir como fato algo sem evidência profissional confirmada;
- prometer economia de tempo sem uma medição real;
- falhar em produção sem Sentry/PostHog, alertas e suporte comprovados.

Os riscos de linguagem enganosa, currículo/destino divergente e evidência frouxa foram corrigidos nesta revisão. Qualidade real de recomendação e observabilidade continuam pendentes.

### O que pode causar candidaturas erradas?

- vaga, requisitos, prazo ou URL alterados depois da aprovação;
- currículo trocado depois da aprovação;
- confundir competências próximas, como Java/JavaScript ou React/React Native;
- reutilizar uma resposta gerada como se fosse um fato do candidato;
- usar preferência de cidade como endereço pessoal;
- concorrência ou repetição deixando sessão, fila e pacote divergentes.

Esses caminhos receberam correções e testes. O risco residual principal é semântico: taxonomia e score ainda não foram validados contra uma amostra real rotulada.

### O que pode gerar custos inesperados?

- descoberta no cliente lê até 200 vagas por geração e cresce linearmente com usuários ativos;
- leituras das coleções de fatos e respostas aprovadas durante preparação;
- refresh, regenerações, listeners e tentativas repetidas de Functions/Firestore;
- recursos de IA fora do pacote Apply, caso quotas globais, orçamento e App Check não sejam configurados;
- logs e eventos sem política de retenção.

O pacote Apply atual não chama provedor generativo, portanto seu custo direto de IA é zero. Foi adicionado cooldown de cinco minutos ao refresh forçado, mas a descoberta deve migrar para candidatos pré-computados/consultas indexadas antes de escalar.

### O que está excessivamente complexo?

- o estado da jornada existe em pacote, fila, sessão e candidatura, além de projeções paralelas em JavaScript e TypeScript;
- enums e mapeamentos de compatibilidade legada aumentam o número de combinações possíveis;
- a camada antiga de agentes/pitch/entrevista amplia superfície e manutenção sem ser necessária ao MVP Apply.

A máquina de estados autoritativa e a reconciliação idempotente reduzem o risco, mas a duplicação dos contratos continua como débito técnico.

### O que está mal testado?

- fluxo em builds assinados de iOS/Android, Safari/Chrome, retorno ao app, clipboard e abertura do PDF;
- concorrência real em Firestore sob carga e comportamento offline prolongado;
- qualidade do score e das recomendações com vagas/candidatos reais rotulados;
- variações de ATS e falhas de sites externos;
- App Check, deploy, alertas, source maps e isolamento no projeto Firebase real;
- acessibilidade com VoiceOver/TalkBack, fonte ampliada e foco;
- objetivo de revisão em menos de dois minutos.

### O que deve sair do MVP?

- automação universal, envio automático e adaptadores específicos de ATS;
- preenchimento de perguntas sensíveis e qualquer tentativa de contornar CAPTCHA/login;
- explicações generativas de recomendação e regeneração ampla antes de haver avaliação de qualidade;
- promessa numérica de “tempo economizado” antes de um benchmark observável;
- camada legada de agentes que não participa da jornada crítica.

O MVP deve manter apenas regras determinísticas, pacote editável com proveniência, fila segura e adaptador genérico manual.

## Cinco problemas mais importantes

| Prioridade | Problema | Estado | Condição para liberar |
|---|---|---|---|
| Bloqueador | Termos, privacidade, bases legais, retenção, operadores, menores e canais ainda são rascunhos | Aberto | Aprovação profissional, publicação HTTPS e processo operacional testado |
| Bloqueador | 151 vagas auditadas têm 931 problemas; nenhuma forma hoje um catálogo publicável útil | Aberto | Curadoria, deduplicação, reverificação e amostra real de qualidade |
| Bloqueador | Deploy, credenciais, regras/índices/Functions, App Check e observabilidade não foram comprovados no projeto real | Aberto | Checklist de produção com evidência e rollback |
| Alto | Não há E2E em builds assinados/aparelhos reais para a candidatura externa | Aberto | Matriz iOS/Android concluída sem perda de estado ou envio ambíguo |
| Alto | Relevância e meta de revisão abaixo de dois minutos não têm validação empírica | Aberto | Teste com candidatos/vagas reais e métricas de funil/tempo |

## Problemas bloqueadores e altos corrigidos no código

- matching de requisitos passou a ser conservador e não aceita substring ambígua;
- resposta apenas gerada não pode virar fato profissional reutilizável;
- cidade pessoal vem do currículo confirmado, nunca da preferência de busca;
- sessão guarda o caminho privado do currículo aprovado e bloqueia CV trocado;
- vaga é revalidada antes da abertura; mudança de conteúdo usa fingerprint SHA-256 e exige nova aprovação;
- o navegador só abre depois da validação do backend;
- candidatura já registrada reconcilia sessão, fila e pacote atomicamente;
- callables do Apply aceitam enforcement separado por `APPLY_ENFORCE_APP_CHECK`;
- descoberta foi limitada a 200 documentos e refresh forçado ganhou cooldown;
- interface deixou de chamar o gerador determinístico de “IA”;
- avisos altos de dependências de produção foram removidos sem upgrade maior do Expo.

## Avaliação técnica

| Área | Avaliação |
|---|---|
| Arquitetura | Boa separação entre descoberta, pacote, fila, estado, sessão externa e analytics; contratos duplicados JS/TS são débito médio. |
| Segurança | Isolamento por usuário e backend-only do Apply passaram no emulador. App Check segue desligado até integração nativa e rollout. |
| Privacidade | Analytics têm allowlist e testes contra PII. Base legal, retenção e inventário de operadores seguem bloqueadores. |
| Consistência | Máquina de estados, revisão, fingerprint, expiração e idempotência estão cobertos; produção concorrente ainda precisa de carga/E2E. |
| Escalabilidade | Adequada apenas para piloto pequeno. Busca de até 200 vagas por usuário não é arquitetura de escala. |
| IA | Apply é determinístico e rastreável; sem custo de provedor. Recursos de IA globais têm quotas, mas dependem de App Check/orçamento. |
| Firebase | Regras locais estão verdes. Custo cresce por leituras de descoberta e o deploy real não foi comprovado. |
| UX | Próxima ação, revisão e fallback manual são claros. Alternância app/navegador e meta de dois minutos não foram validadas em aparelho. |
| Observabilidade | Taxonomia e sanitização existem; PostHog/Sentry, alertas e source maps ainda não têm evidência de produção. |
| Manutenção | Módulos são legíveis e testáveis; estados redundantes e legado aumentam custo de mudança. |

## Validação executada

- `npm run beta:check`: aprovado;
- TypeScript estrito e ESLint: zero erros e avisos;
- 188 testes de app/domínio/Functions: aprovados;
- 29 testes de Auth, Firestore Rules e Storage Rules no emulador: aprovados;
- total do gate: 217 testes aprovados, zero falhas;
- website Vite: build de produção aprovado;
- Expo web export: aprovado, 3.507 módulos;
- Expo Doctor: 18/18 verificações aprovadas;
- auditoria de segredos local: nenhum padrão encontrado;
- dependências: grafo completo do app/tooling com 22 avisos moderados, produção do app com 16 e Functions com 9; zero alto/crítico;
- catálogo: 151 vagas, 931 problemas, 0 críticos, 794 erros e 137 avisos.

O export avisou que organização/projeto do Sentry não estão configurados no ambiente de build; isso confirma a pendência operacional de source maps/monitoramento.

## Critério final

Em testes automatizados, a jornada completa funciona e impede os principais erros de consentimento, proveniência, versão e duplicidade. Para usuários reais, o critério ainda não é atendido porque não existe oferta curada publicável nem comprovação em produção/aparelhos reais.

**Gate final: NÃO LANÇAR.** Reavaliar somente após fechar os cinco itens prioritários acima, sem rebaixar os três bloqueadores.
