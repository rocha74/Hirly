# Hirly · Business Plan

**Versão:** 1.0 (rascunho técnico)
**Data:** Maio 2026
**Confidencial — uso interno**

---

> Este documento é uma base completa de plano de negócios montada a partir
> do código, design e contexto técnico do app Hirly. Campos marcados como
> **`[A PREENCHER]`** dependem de informação de negócio/jurídica/financeira
> que você ainda não me passou — uma lista consolidada está na seção final
> "Pendências para preencher".

---

## Sumário

1. [Sumário Executivo](#1-sumário-executivo)
2. [Visão, Missão, Valores](#2-visão-missão-valores)
3. [Problema & Oportunidade](#3-problema--oportunidade)
4. [Solução: o Hirly](#4-solução-o-hirly)
5. [Mercado-Alvo & Personas](#5-mercado-alvo--personas)
6. [Análise Competitiva](#6-análise-competitiva)
7. [Produto: estado atual & roadmap](#7-produto-estado-atual--roadmap)
8. [Arquitetura Técnica](#8-arquitetura-técnica)
9. [Modelo de Negócio](#9-modelo-de-negócio)
10. [Estratégia Go-to-Market](#10-estratégia-go-to-market)
11. [Operações](#11-operações)
12. [Equipe](#12-equipe)
13. [Projeções Financeiras](#13-projeções-financeiras)
14. [Plano de Captação](#14-plano-de-captação)
15. [Riscos & Mitigações](#15-riscos--mitigações)
16. [Compliance & Jurídico](#16-compliance--jurídico)
17. [Métricas-chave (KPIs)](#17-métricas-chave-kpis)
18. [Roadmap 12-18 meses](#18-roadmap-12-18-meses)
19. [Pendências para preencher](#19-pendências-para-preencher)

---

## 1. Sumário Executivo

**Hirly** (`Hire + Early`) é um aplicativo mobile que reinventa a busca por
estágio, trainee e primeiro emprego no Brasil para a Geração Z — formato de
feed vertical estilo TikTok com **match score personalizado** baseado em
perfil + currículo, e curadoria de vagas voltada exclusivamente para quem
está começando a carreira.

**Tese central:**
> A primeira experiência de busca de emprego no Brasil hoje é hostil para
> quem cresceu no TikTok: plataformas datadas (LinkedIn, Catho, Vagas.com)
> são feitas para profissionais experientes, exigem currículos longos,
> filtros complicados, candidaturas demoradas e mostram majoritariamente
> vagas inacessíveis para iniciantes. O Hirly resolve isso com um produto
> 100% mobile-first, swipe-native, IA-assistido e curado para 18-28 anos.

**O que está pronto hoje (estado do app):**
- Onboarding em 6 etapas com **autofill por IA via Claude** (parse de CV PDF)
- Feed vertical com swipe, double-tap pra curtir, animações 60fps
- Algoritmo de match (100 pts: modalidade 25, salário 30, localização 20,
  área 15, oportunidade 5, interesses 5, modificador ±20 por prioridades)
- Filtros, vagas curtidas, candidaturas marcadas, perfil editável
- Design System v3 profissional (paleta dark, gradients brand, animações
  spring, tipografia Geist + JetBrains Mono)
- Firebase Auth + Firestore + Storage configurado
- ~70 vagas reais já importadas via parser de WhatsApp
- Política de Privacidade e Termos de Uso versionados

**Asks principais (resumo da seção 19):**
- Definição de modelo de receita e pricing
- Constituição da PJ + CNPJ + conta empresarial
- Captação inicial (bootstrap, FFF ou anjo)
- Time fundador definido e papéis claros
- Estratégia de aquisição inicial (universidades, Instagram, TikTok)
- Plano de operações de curadoria de vagas

---

## 2. Visão, Missão, Valores

### Visão
> Ser o primeiro app de carreira que o jovem brasileiro abre quando decide
> começar a trabalhar — substituindo grupos de WhatsApp aleatórios e
> plataformas que ignoram quem está começando.

### Missão
> Conectar jovens 18-28 anos a oportunidades reais de início de carreira
> com a velocidade do TikTok, a confiança do LinkedIn e o respeito visual
> de uma marca premium.

### Valores (também filosofia do produto)
1. **Velocidade respeita o tempo** — toda interação custa segundos, não
   minutos. CV em 30s. Candidatura em 1 toque.
2. **Curadoria > volume** — preferimos 100 vagas perfeitas a 10.000 vagas
   irrelevantes.
3. **Transparência no match** — o usuário vê *por que* uma vaga é
   compatível. Nada de caixa-preta.
4. **Acessível** — sem barreira de pagamento para o candidato. Nunca.
5. **Real só real** — vagas verificadas, sem pirâmide, sem multinível,
   sem golpe.

---

## 3. Problema & Oportunidade

### 3.1 A dor real

**Candidato (18-28 anos, primeiro emprego):**
- LinkedIn é feito pra sênior — algoritmo enterra perfil sem experiência
- Catho/Vagas/Gupy têm UX de 2010 e cobram do candidato em alguns casos
- Grupos de WhatsApp têm volume mas zero curadoria, zero match,
  candidatura é manual, vagas se misturam com pirâmide
- Currículo é barreira: ninguém ensinou a escrever um na escola
- Não sabe se está aplicando bem; não sabe se a vaga combina; não sabe
  se foi rejeitado ou só ignorado
- **Resultado:** desânimo, fricção, abandono da busca

**Recrutador junior/estagiário:**
- Recebe centenas de currículos genéricos em portais antigos
- Sem filtragem inteligente — leitura manual de 80% do funil
- Custo por contratação alto via plataforma tradicional (R$200-2.000/vaga)
- Difícil chegar até talentos jovens que não estão em LinkedIn ainda

### 3.2 Tamanho do mercado (Brasil)

**TAM — Total Addressable Market:**
- **48 milhões** de jovens 15-29 anos no Brasil (IBGE)
- Faixa 18-28 anos (alvo Hirly): **~36 milhões**
- Universitários + ensino médio recém-formado: **~12 milhões**

**SAM — Serviceable Available Market:**
- Jovens 18-28 em busca ativa de estágio/trainee/1º emprego em qualquer
  momento: **~6-8 milhões** (estimativa conservadora baseada em ABRES e
  CIEE)
- Brasil tem **~800.000 estagiários** ativos a qualquer momento
- Programas trainee abrem ~50.000 vagas/ano

**SOM — Serviceable Obtainable Market (3 anos):**
- 5% do SAM = **300-400 mil usuários ativos mensais** como meta plausível
- Conservador: 100k MAU em 18 meses, 500k MAU em 36 meses

### 3.3 Por que agora?

1. **Geração Z prefere mobile-first vertical** — TikTok é a referência de
   UX (1B+ usuários globais)
2. **IA acessível** — parser de CV via Claude/GPT virou commodity em 2024-25
3. **Crise do LinkedIn** — saturação, ruído, monetização agressiva afasta
   jovens
4. **Reforma trabalhista + economia gig** — mais vagas atípicas, jovem
   precisa de tooling moderno
5. **Pós-pandemia normalizou home office** — pool de vagas explode com
   modalidades remoto/híbrido

---

## 4. Solução: o Hirly

### 4.1 Promessa central

> **Sua próxima vaga, num swipe.**

### 4.2 Como funciona (jornada do usuário)

1. **Onboarding em 60 segundos** (6 telas)
   - Upload de CV em PDF → IA Claude extrai nome, curso, universidade,
     skills, idiomas, experiências
   - Confirma campos extraídos (toggle individual)
   - Define objetivo (estágio / trainee / 1º emprego)
   - Confirma área de interesse (10 áreas pré-definidas)
   - Preferências: modalidade, faixa salarial, localização
   - Formação (curso + universidade)
   - Consentimento LGPD

2. **Feed personalizado**
   - Swipe vertical entre vagas (1 vaga = 1 tela)
   - Match score visível (0-100, 3 tiers visuais: alto verde, médio roxo,
     baixo cinza)
   - Tag pulse: presencial/híbrido/remoto, estágio/trainee/CLT, "há X dias"
   - Salário/bolsa em destaque + benefícios em ícones
   - Skills da vaga ↔ skills do usuário (hits marcados em verde)

3. **Interações**
   - **Double-tap** = curtir (salva pra ver depois)
   - **Tap simples** = abre detalhes (descrição completa, requisitos,
     diferenciais, benefícios, vagas similares)
   - **Swipe up** = próxima vaga
   - **Tap "Candidatar-se"** = redireciona pro site da empresa (registra
     candidatura no perfil)
   - **Long-press** = ainda livre (futuro: compartilhar)

4. **Perfil & gestão**
   - Edita qualquer campo do CV extraído
   - Vê todas as vagas curtidas e candidatadas (tabs)
   - Configura "Match Priorities" (required / important / nice) por
     critério — afina o algoritmo em ±20pts
   - Acompanha completude do perfil (banner sugerindo o que falta)

### 4.3 Diferenciais defensáveis

| Feature | Hirly | LinkedIn | Catho/Vagas | WhatsApp |
|---|---|---|---|---|
| Feed swipe vertical (TikTok-like) | ✅ | ❌ | ❌ | ❌ |
| Match score visível | ✅ | △ | ❌ | ❌ |
| CV parser por IA | ✅ | ❌ | ❌ | ❌ |
| Curadoria pra 18-28 anos | ✅ | ❌ | ❌ | ❌ |
| Mobile-first nativo | ✅ | △ | ❌ | ✅ |
| Gratuito pro candidato | ✅ | △ | △ | ✅ |
| Anti-fake (futuro) | ✅ | ❌ | ❌ | ❌ |

### 4.4 Estado do produto (Maio 2026)

**Pronto e funcionando:**
- ✅ Auth completo (signup, login, recuperação de senha, verificação email)
- ✅ Onboarding 6 etapas com Design System v3
- ✅ CV upload pra Firebase Storage (resumable upload via REST)
- ✅ Parser de CV com Claude (extração estruturada via tool use)
- ✅ Tela de revisão do CV extraído com toggles por campo
- ✅ Feed swipe com match score animado, gradient mesh deterministico
  por empresa, action bar (CTA candidatar + pass + save)
- ✅ Filtros (modalidade, contrato, salário, localização, ordenação)
- ✅ Vagas curtidas + candidatadas (tabs)
- ✅ Perfil editável + Match Priorities configuráveis
- ✅ 70+ vagas reais importadas (Catho/Vagas/Gupy estilo)
- ✅ Regras Firestore + Storage publicadas
- ✅ Política de Privacidade + Termos de Uso

**Shipado em Maio 2026 (suite IA completa):**
- ✅ Match Explainer (Claude analisa por que vaga combina, cache 100%)
- ✅ Pitch Generator (cover letter + WhatsApp pronto pra colar, 3 tons)
- ✅ Job TLDR (resumo IA em 3-5 bullets + red flag detector)
- ✅ CV Coach (score 0-100 + próximos passos personalizados)
- ✅ Mock Interview prep (perguntas prováveis + outline de resposta)
- ✅ Compartilhamento de vaga (Share nativo iOS/Android + universal link)
- ✅ Denúncia de vaga (7 motivos + fila de moderação)
- ✅ Firestore Security Rules atualizadas pras novas coleções

**Em desenvolvimento (não shipado):**
- 🚧 Push notifications de vagas novas (Expo Push)
- 🚧 Painel admin pra adicionar vagas (cola texto → IA parseia)
- 🚧 Analytics (Firebase Analytics) + Sentry
- 🚧 Testes unitários (matchScore, salary, timeAgo)
- 🚧 App icon + splash profissionais
- 🚧 Submissão App Store / Play Store

---

## 5. Mercado-Alvo & Personas

### 5.1 Persona primária: Marina, 21 anos

- Estudante de Administração na PUC-SP, 5º semestre
- Mora com os pais, faz iFood pra ter dinheiro próprio
- Quer estágio remunerado em empresa "legal" (não banco)
- 5h/dia no TikTok, 2h no Instagram
- Tem LinkedIn mas só usou pra perfil de tarefa de faculdade
- Tentou Catho, achou "ruim e cheio de vaga estranha"
- Grupo de WhatsApp de estágio do curso é o canal principal hoje
- Frustração: "não sei nem por onde começar"

### 5.2 Persona secundária: Lucas, 24 anos

- Formado em Engenharia há 6 meses na UFMG
- Mora no interior, quer mudar pra SP/Floripa
- Procura trainee em empresas com cultura "tech"
- Frustração: "trainee é difícil e o LinkedIn não me ajuda a achar"
- Apto a pagar por **acelerador de carreira** (futuro premium?)

### 5.3 Persona terciária (B2B futuro): Júlia, 28 anos

- People Analyst em startup média (50-200 funcionários)
- Precisa contratar 3 estagiários/trim, orçamento limitado pra hub
- Hoje gasta R$ 800-1.500 por vaga em portais
- Adoraria um Tinder-like pra recrutamento jovem

### 5.4 Segmentação geográfica

**Fase 1 (lançamento):** SP capital + ABC (maior pool universitário + maior
mercado de estágios = 1.2M alunos em ensino superior na grande SP)

**Fase 2 (6-12 meses):** RJ, MG, RS, PR

**Fase 3 (12-24 meses):** Capitais restantes + remoto nacional

---

## 6. Análise Competitiva

### 6.1 Concorrentes diretos

| Concorrente | Forças | Fraquezas | Gap que Hirly ataca |
|---|---|---|---|
| **LinkedIn** | Marca, network, recrutadores | UX desktop, hostil a iniciantes, ruidoso | Feed mobile-first focado em iniciantes |
| **Catho** | Volume de vagas, marca | UX 2010, cobra do candidato em planos | UX moderna + gratuito |
| **Vagas.com** | Volume, parceria com universidades | Site lento, app fraco, sem match real | Mobile nativo + IA |
| **Gupy** | Foco corporativo, ATS | Não é pro candidato — é pra RH | Hirly é o "consumer-side" do Gupy |
| **Infojobs** | Conhecido | Em declínio, UX antiga | Geração nova |
| **CIEE** | Marca em estágio, contrato direto | Burocrático, lento, site ruim | Velocidade + curadoria |
| **99jobs / Programa de Inclusão** | Foco em diversidade | Nicho pequeno | Hirly é mais amplo |

### 6.2 Concorrentes indiretos

- **Grupos de WhatsApp** — maior concorrente real hoje (volume + zero
  fricção). Hirly precisa ser MELHOR que esses grupos.
- **LinkedIn Posts** — recrutadores postam vagas em feed. Difícil filtrar.
- **Instagram (@vagas_estagio_xx)** — perfis que repostam vagas. Sem busca.
- **Universidades (carreiras.usp.br etc)** — fragmentado, limitado.

### 6.3 Análise SWOT

**Forças:**
- Produto tecnicamente robusto e diferenciado já em alpha
- Design profissional de nível Silicon Valley
- Stack moderno (Expo SDK 54, RN 0.81, Firebase, Claude AI)
- Founder com vontade clara e visão consistente

**Fraquezas:**
- Marca ainda não conhecida (zero base de usuários)
- Operações de curadoria de vagas ainda manuais
- Sem time de vendas (necessário pra B2B)
- Sem captação ainda — bootstrap dependente
- `[A PREENCHER]` — experiência prévia do time em produto/recrutamento

**Oportunidades:**
- Vácuo no mercado de "carreira pra Geração Z"
- IA viabiliza features que eram impraticáveis há 2 anos
- Parcerias com universidades (40+ no estado de SP só)
- Movimento de jovens saindo do LinkedIn

**Ameaças:**
- LinkedIn pode lançar produto similar (improvável mas possível)
- Catho/Vagas podem acordar e modernizar
- Recessão econômica reduz vagas de estágio (sensibilidade macro)
- Saturação de apps de carreira já está acontecendo

---

## 7. Produto: estado atual & roadmap

### 7.1 MVP atual (funcional, não publicado)

Detalhado na seção 4.4. Resumo: o app está pronto para alfa fechado com
~100 usuários.

### 7.2 Próximos lançamentos (Q3 2026)

**Beta privado (Junho-Julho 2026):**
- App icon + splash profissionais
- Push notifications via Expo Push
- Onboarding com video de 15s no Welcome
- Submetido às lojas
- ~500 usuários convidados

**Beta público (Agosto 2026):**
- Landing page hirly.app pra captura de e-mail
- TestFlight aberto + Play Store beta
- ~2.000 usuários
- Painel admin pra curar vagas
- Compartilhamento de vaga (deep link)
- Denúncia de vaga + moderação

**v1.0 GA (Setembro-Outubro 2026):**
- Lançamento público nas lojas
- Campanha Instagram + TikTok
- Parcerias universitárias formalizadas
- Analytics + Sentry em produção

### 7.3 Features futuras (12 meses)

Por ordem de impacto previsto:
1. ✅ **Match explainer com IA** — shipado Maio 2026
2. ✅ **Pitch generator com IA** — shipado Maio 2026
3. ✅ **CV coach** — shipado Maio 2026
4. ✅ **Resumo de vaga em bullets** — shipado Maio 2026
5. ✅ **Preparação pra entrevista** — service criado, UI a wirar
6. 🚧 **Painel B2B** — empresas postam vagas e veem candidatos
7. 🚧 **Verificação de empresa** — selo "empresa verificada"
8. 🚧 **Estatísticas de aplicação** — "85% dos que se candidataram foram
   chamados pra entrevista"
9. 🚧 **Comunidade** — fórum / Discord embutido pra dicas de carreira
10. 🚧 **Coaching humano** (premium) — consulta com mentor de carreira
11. 🚧 **Verificação anti-fake automática** — IA detecta MLM/pirâmide

---

## 8. Arquitetura Técnica

### 8.1 Stack

**Frontend:**
- React Native 0.81 + Expo SDK 54 (managed workflow)
- TypeScript strict
- Reanimated 4 + react-native-gesture-handler 2.28 (animações 60fps)
- @react-navigation/native-stack v7
- Lucide-react-native (ícones)
- @expo-google-fonts: Geist, JetBrains Mono, SpaceGrotesk, Inter

**Backend (atual):**
- Firebase Auth (email/senha + verificação)
- Firestore (perfis, vagas, curtidas, candidaturas)
- Firebase Storage (CVs em PDF)
- Regras de segurança versionadas

**IA:**
- Anthropic Claude API (Sonnet 4.6) — parser de CV via tool use
- Custo estimado: $0.02 por CV parseado

**Infraestrutura DevOps (a implementar):**
- Expo EAS Build pra builds nativos
- Expo OTA pra hotfixes JS sem submeter à loja
- Firebase Cloud Functions (proxy da Claude API, jobs scheduled) — `[A IMPLEMENTAR]`
- Firebase App Check (proteção anti-abuse) — `[A IMPLEMENTAR]`

### 8.2 Algoritmo de Match (matchScore.ts)

Score base 0-100:
- **Modalidade preferida** — 25 pts se bate
- **Faixa salarial** — 30 pts (cheia se dentro do range, escalonado fora)
- **Localização** — 20 pts (cidade exata) / 10 pts (mesmo estado)
- **Área de interesse** — 15 pts se bate
- **Tipo de oportunidade** — 5 pts (estágio/trainee/CLT)
- **Interesses (skills)** — 5 pts proporcional a overlap

Modificador via Match Priorities (configurável pelo usuário):
- **Required** — -20 pts se não bate (penaliza forte)
- **Important** — +0 (neutro mas usado em sort)
- **Nice** — +5 pts se bate (bônus)

Saída: score 0-100 + lista de motivos textuais ("Mesma área", "Salário
compatível", etc).

### 8.3 Custos de infra (estimativa mensal)

| Componente | Free Tier | Custo após | Estimativa 1k MAU |
|---|---|---|---|
| Firebase Auth | 50k/mês | $0.0055 por auth | $0 |
| Firestore | 50k reads/dia, 20k writes/dia | $0.06/100k reads | $5-20 |
| Firebase Storage | 5GB | $0.026/GB | $1-5 |
| Cloudflare CDN (futuro) | 100k requests | $0 | $0 |
| Claude API (CV parser) | $0 | $0.02/CV | $20 (1k usuários upando 1 CV) |
| Expo EAS Build | grátis | $99/mês plano paid | $99 (recomendado a partir do beta) |
| Expo Push Notifications | grátis | — | $0 |
| **Total mensal (1k MAU)** | | | **~$125-150 USD** |

### 8.4 Escalabilidade

Firebase suporta milhões de usuários sem reescrita. Bottleneck previsível:
- Firestore reads em feed (precisa de cache local agressivo) — resolvido com
  query cursors + LocalStorage
- Storage upload de CVs (5MB cada × usuários) — escalável horizontal
- Claude API rate limits — implementar fila + cache de resultados

---

## 9. Modelo de Negócio

> **Esta seção tem várias decisões em aberto.** Apresento opções com
> análise de pros/contras. Você precisa decidir qual seguir.

### 9.1 Princípio fundador (sugestão)

> **Candidato nunca paga.** A monetização vem do lado das empresas.

Razão: jovem em primeiro emprego é o público mais sensível a preço (renda
zero ou baixa). Cobrar do candidato é morte certa nesse nicho. Catho já
provou que esse caminho não vai longe.

### 9.2 Opções de receita (B2B — lado da empresa)

**Opção A — Pay-per-post (transacional):**
- R$ 49-99 por vaga ativa por 30 dias
- Comparação: Catho R$ 119-279/vaga, LinkedIn R$ 600+/vaga
- Tickets baixos = fácil de vender, alto volume necessário

**Opção B — Subscription mensal:**
- "Hirly Empresas" — R$ 299/mês = vagas ilimitadas + acesso a filtragem
  de candidatos
- "Hirly Empresas Plus" — R$ 799/mês = + IA matching reverso, exporta
  candidatos, analytics
- Modelo previsível, melhor pra fluxo de caixa

**Opção C — Performance (sucess fee):**
- R$ 500-1.500 por contratação efetivada
- Difícil de operacionalizar (precisa rastrear contratação)
- Alinha incentivo perfeito (empresa só paga se conseguir gente)

**Opção D — Híbrido (recomendado pra escala):**
- Plano grátis: 1 vaga ativa, pagina pública
- Plano Starter R$ 299/mês: 10 vagas + filtragem básica
- Plano Growth R$ 899/mês: ilimitado + IA matching + suporte
- Plano Enterprise (custom): API, integração ATS, BI

**Decisão tomada (Maio 2026):** **Opção D — Híbrido com freemium B2B**, escalonado em 4 tiers.

| Plano | Preço | Inclui |
|---|---|---|
| **Free** | R$ 0 | 1 vaga ativa, página pública do recrutador, branding Hirly |
| **Starter** | R$ 299/mês | 10 vagas ativas, filtragem básica de candidatos, dashboard de candidaturas |
| **Growth** | R$ 899/mês | Vagas ilimitadas, IA matching reverso (vê melhores candidatos primeiro), exporta CSV, analytics, suporte priority |
| **Enterprise** | A partir R$ 5.000/mês | API, integração com ATS (Gupy/Kenoby/Pandapé), BI dedicado, account manager, SLA 4h |

**Por quê híbrido:**
- Free tier elimina fricção de aquisição e gera prova social (cada vaga free é marketing pra Hirly)
- Starter R$ 299 capta SMB (50-200 funcionários) — sweet spot mais defensável vs LinkedIn (R$ 600+) e Catho (R$ 119-279)
- Growth R$ 899 é onde está a margem real — IA matching é diferencial defensável
- Enterprise abre teto pra grandes contas (Itaú, Ambev, Magalu) com receita previsível

**Princípio reforçado:** **candidato nunca paga**. Hirly Pro (premium consumer) só será considerado após 50k MAU.

### 9.3 Opções de receita futura (lado do candidato — premium opcional)

> ⚠️ Só implementar depois de 50k+ MAU e PMF claro.

- **Hirly Pro** R$ 19/mês:
  - Ver quem viu seu perfil
  - Boost de candidatura (sua vaga vai pro topo do RH)
  - CV coach com IA ilimitado
  - Mock interviews com IA
  - Sem ads
- Conversão esperada: 1-3% dos MAU
- Em 100k MAU = 1k-3k pagantes = R$ 19k-57k/mês

### 9.4 Outros canais de receita

- **Cursos / parcerias** — afiliação com Alura, Rocketseat, Trybe etc.
- **Ferramentas pagas terceirizadas** — link afiliado pra criadores de CV,
  cartas, etc
- **Eventos / feiras de carreira** — sponsorship de empresas pra evento
  Hirly
- **Conteúdo / newsletter** — patrocínio de marcas em e-mail semanal

### 9.5 Unit economics (estimativa simulada)

Premissas:
- CAC (custo de aquisição) candidato: `[A PREENCHER]` (estimativa: R$ 3-8 via Instagram/TikTok ads pro nicho jovem)
- CAC empresa: `[A PREENCHER]` (estimativa: R$ 500-2.000 via outbound)
- LTV candidato: R$ 0 (não paga) — mas gera valor pra empresa
- LTV empresa: R$ 299 × 12 meses = R$ 3.588 (assumindo 12 meses retenção
  no plano Starter, churn 8%/mês)

**LTV/CAC empresa = ~2-7x** (saudável)

---

## 10. Estratégia Go-to-Market

### 10.1 Estratégia de aquisição de candidatos

**Canal 1: Instagram + TikTok (CAC esperado mais baixo)**
- Conteúdo orgânico: dicas de carreira, "vagas estranhas que vi", reels
  com bastidores do app
- Frequência: 1 post/dia, 3 reels/semana
- Influenciadores nicho (5-50k seguidores) em troca de promoção mútua
- Anúncios pagos: R$ 5-15k/mês após validação inicial

**Canal 2: Universidades (alto valor, ciclo lento)**
- Parcerias com CASAs / atléticas / centros acadêmicos
- Apresentações de carreira como contrapartida
- Sticker pack + adesivo da marca distribuído nos campus
- Meta: 20 universidades em SP no 1º ano

**Canal 3: Influência da Geração Z específica**
- TikTokers de carreira jovem (não-grandes — micro)
- YouTubers de "vida universitária"
- Embaixadores: alunos representantes do Hirly por curso

**Canal 4: SEO + Content Marketing (longo prazo)**
- Blog "hirly.app/carreira" com guias: "Como conseguir estágio em Tech",
  "Salário médio de trainee em SP", etc.
- Meta: 50k visitas orgânicas/mês em 12 meses

**Canal 5: PR**
- Imprensa: Exame, Forbes Under 30, UOL, G1, Folha
- Pitch: "App brasileiro que reinventa busca de emprego para jovens"
- Histórias: primeira contratada pelo Hirly, viralização TikTok

**Estimativa CAC:** R$ 3-8 nos primeiros 6 meses, decrescente com
viralização e brand awareness.

### 10.2 Estratégia de aquisição de empresas (B2B)

**Fase 1 (0-6 meses):** Founder-led sales
- Targets: 100 empresas de médio porte em SP que contratam jovens
- Outbound: LinkedIn DM + e-mail personalizado pro RH
- Demo + onboarding gratuito por 30 dias
- Meta: 20 empresas pagantes em 6 meses

**Fase 2 (6-12 meses):** SDR + AE hire
- Time inside sales (2 SDRs + 1 AE)
- Inbound via marketing de conteúdo (e-books, webinars)
- Meta: 100 empresas pagantes em 12 meses

**Fase 3 (12+ meses):** Self-serve + enterprise
- Self-serve no site (cartão de crédito, conta automática)
- Vendas enterprise pra grandes corporativas (R$ 5k+ por mês)

### 10.3 Estratégia de retenção (candidato)

- Push notification diário: "3 vagas novas combinam com você"
- E-mail semanal: digest de vagas + dicas
- Gamificação leve: streak de "candidaturas feitas esta semana"
- Conteúdo educacional in-app: "X dicas para sua próxima entrevista"

### 10.4 Estratégia de viralização

- **Compartilhamento de vaga** — usuário envia vaga interessante pra amigo
  via WhatsApp com deep link
- **Indicação** — convida amigo, ambos ganham acesso ao "Hirly Pro" por 1
  mês (quando lançar)
- **Cards bonitos** — feed instagramável (jovem tira print e posta no
  story)
- **Conteúdo viral** — sticker pack TikTok, transitions com efeito do app

---

## 11. Operações

### 11.1 Curadoria de vagas

**Hoje:**
- Sócios buscam vagas em grupos de WhatsApp, Catho, Vagas
- Manda pra você
- Você usa `scripts/importVagas.js` (linha de comando) pra adicionar ao
  Firestore
- 70 vagas no banco

**Próximo passo (essencial pra escalar):**
- Painel admin web simples (pode ser Next.js + Firebase) pra que sócios
  adicionem vagas direto, sem precisar de você
- Parser IA: cola texto bruto de vaga (de qualquer lugar) → vira `Job`
  estruturado automaticamente
- Custo: ~$0.001 por vaga parseada
- Tempo de implementação: 3-5 dias de dev

**Médio prazo:**
- Bot que monitora feeds de Catho/Gupy/Vagas via RSS/scraping (verificar
  legalidade)
- Importa automaticamente vagas que batem com nosso filtro de público
  (estágio/trainee/1ºemprego)

**Longo prazo (autossustentável):**
- Empresas postam direto via painel B2B
- Hirly vira plataforma primária, não agregador

### 11.2 Suporte ao usuário

- Tier 1: FAQ in-app + chat com IA (Claude pode responder ~80% das
  dúvidas)
- Tier 2: Email support@hirly.app (1 pessoa parcial)
- SLA: 24h resposta inicial

### 11.3 Moderação

- Botão "denunciar vaga" → entra fila de moderação
- Algoritmo de detecção de fake (futuro com IA)
- Quem denuncia 3+ vagas legítimas é bloqueado pra evitar abuse
- Trabalho de moderação: ~2-4h/semana inicial (founder ou contractor)

### 11.4 Ferramentas internas

- **Linear / Notion** — gestão de tarefas e roadmap
- **Slack / Discord** — comunicação do time
- **Stripe** — cobrança B2B (quando lançar receita)
- **Mixpanel / Amplitude** — analytics de produto
- **Pipedrive / HubSpot** — CRM de vendas B2B
- **Sentry** — monitoramento de erros

---

## 12. Equipe

### 12.1 Estrutura atual

`[A PREENCHER]` — Confirme os nomes, papéis e percentual de participação:
- Founder principal: **`[A PREENCHER nome, papel, %]`**
- Sócios (mencionados pra buscar vagas): **`[A PREENCHER nomes e papéis]`**

### 12.2 Hires necessários (próximos 12 meses)

**Curto prazo (3-6 meses):**
- **Desenvolvedor mobile pleno** (RN + Firebase) — alivia carga técnica
- **Operador de vagas / community manager** — curadoria de vagas + suporte
- Custo estimado: R$ 6-10k/mês cada

**Médio prazo (6-12 meses):**
- **Designer (part-time ou freela)** — manter Design System v3
  evoluindo
- **Growth marketer** — gestão de Instagram/TikTok orgânico + paid
- **SDR / vendedor B2B** — quando ativar monetização

**Longo prazo (12+ meses):**
- CTO / Tech Lead, Product Manager, Head of Sales

---

## 13. Projeções Financeiras

> Todas as projeções são **modelos de hipótese**. Variáveis-chave precisam
> ser validadas em campo.

### 13.1 Premissas (modelo conservador)

| Variável | Mês 1 | Mês 6 | Mês 12 | Mês 24 |
|---|---|---|---|---|
| Usuários ativos mensais (MAU) | 50 | 5k | 25k | 100k |
| Empresas pagantes (B2B Starter R$ 299) | 0 | 10 | 50 | 200 |
| Empresas Plus/Growth (R$ 899) | 0 | 2 | 15 | 80 |
| Empresas Enterprise (R$ 5k avg) | 0 | 0 | 2 | 10 |

### 13.2 Receita projetada (R$ / mês)

| Mês | Starter | Plus | Enterprise | **Total mensal** |
|---|---|---|---|---|
| 1 | 0 | 0 | 0 | **R$ 0** |
| 6 | 2.990 | 1.798 | 0 | **R$ 4.788** |
| 12 | 14.950 | 13.485 | 10.000 | **R$ 38.435** |
| 24 | 59.800 | 71.920 | 50.000 | **R$ 181.720** |

**Receita acumulada 12 meses:** ~R$ 150k
**Receita acumulada 24 meses:** ~R$ 1,2M

### 13.3 Custos (R$ / mês)

| Categoria | Mês 1 | Mês 6 | Mês 12 | Mês 24 |
|---|---|---|---|---|
| Infra (Firebase + Claude + Expo) | 100 | 500 | 1.500 | 5.000 |
| Salários (founders parciais) | 0 | 8.000 | 25.000 | 70.000 |
| Marketing (ads + conteúdo) | 0 | 3.000 | 10.000 | 30.000 |
| Ferramentas (Stripe, Sentry, etc) | 200 | 800 | 1.500 | 3.000 |
| Jurídico / contabilidade | 1.000 | 1.500 | 2.500 | 5.000 |
| **Total mensal** | **1.300** | **13.800** | **40.500** | **113.000** |

### 13.4 Break-even

**Receita mensal = Custos mensais ≈ Mês 15-18** (modelo conservador)

**Burn rate até break-even:** R$ 400-600k acumulados

### 13.5 Necessidade de capital

| Cenário | Captação necessária | Uso |
|---|---|---|
| Bootstrap | R$ 50-100k FFF/próprio | Lançamento alfa + beta |
| Pre-seed (anjo) | R$ 300-500k | Beta público + 5k MAU + primeiros B2B |
| Seed | R$ 2-5M | Escala 50k+ MAU + time de 8-12 pessoas |
| Series A | R$ 15-30M | Liderança nacional + expansão |

`[A PREENCHER]` — Decidir qual rota seguir e quando começar conversas.

---

## 14. Plano de Captação

`[A PREENCHER em sua maior parte]` — depende da estratégia financeira.

### 14.1 Cenário "Bootstrap puro"

- Capital próprio + revenue early de B2B
- Vantagem: equity preservada, foco em sustentabilidade
- Desvantagem: crescimento limitado pela geração de caixa

### 14.2 Cenário "Friends, Family & Fools"

- R$ 50-200k de família/amigos
- Convertível em equity futuro (SAFE simples)
- Vantagem: rápido, sem pitch deck pronto
- Desvantagem: relações pessoais misturadas

### 14.3 Cenário "Anjo + Aceleradoras"

- R$ 300-500k de anjos brasileiros (Anjos do Brasil, Bossa Nova)
- Programas: Y Combinator, Distrito, ACE, Wayra, Endeavor Scale-Up
- Vantagem: dinheiro + mentoria + network
- Desvantagem: 6-15% equity dilution + relatórios mensais

### 14.4 Cenário "VC Seed"

- R$ 2-5M de fundo seed (Kaszek, Maya Capital, Astella, Canary)
- Pitch necessário: tração mínima (5k+ MAU, 20+ empresas pagantes)
- Vantagem: capital significativo + posicionamento de mercado
- Desvantagem: 15-25% dilution + governança formal

---

## 15. Riscos & Mitigações

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| 1 | LinkedIn lança feature concorrente | Baixa | Alto | Mover rápido pra cravar marca em Geração Z; LinkedIn não consegue pivotar UX a tempo |
| 2 | Falta de vagas (chicken-and-egg) | Alta | Crítico | Founders/sócios curam manualmente nos 6 primeiros meses; parser IA acelera |
| 3 | LGPD / multa por uso indevido de dados | Média | Alto | Política atualizada, contrato com DPO, criptografia, exclusão por solicitação |
| 4 | Apple/Google rejeita app | Baixa | Alto | Seguir guidelines, testes em TestFlight extensivos |
| 5 | Bug crítico em produção | Média | Médio | Expo OTA permite hotfix sem submissão; Sentry alerta cedo |
| 6 | Recessão reduz vagas | Média | Alto | Diversificar pra trainee + 1º emprego (mais resilientes que estágio em pandemia) |
| 7 | Custo de aquisição explode | Média | Alto | Focar em orgânico (TikTok/Instagram) + viralização nativa |
| 8 | Churn alto de empresas (B2B) | Média | Alto | Onboarding hand-holding nos 90 primeiros dias; account manager pra Plus+ |
| 9 | API Claude muda preço ou tira PDF support | Baixa | Médio | Multi-vendor: OpenAI + Anthropic como fallback |
| 10 | Founder ou sócio sai | Média | Crítico | Acordo de vesting (4 anos, cliff 1 ano) + cláusula de boas-saídas |

---

## 16. Compliance & Jurídico

### 16.1 Documentos já em projeto

- ✅ `docs/POLITICA-PRIVACIDADE.md`
- ✅ `docs/TERMOS-DE-USO.md`
- ✅ `docs/DISCLAIMERS-IN-APP.md`
- ✅ `docs/GUIA-IMPORTACAO-VAGAS.md`
- ✅ `docs/LEGAL-MANUAL-REVIEW.md` (pendencias para revisao profissional)

### 16.2 Itens críticos para conformidade

- [ ] Constituir CNPJ (recomendado: ME ou LTDA, contador local)
- [ ] Hospedar Política de Privacidade pública em **https://hirly.app/privacidade**
- [ ] Termos de Uso pública em **https://hirly.app/termos**
- [ ] Implementar fluxo LGPD: exportar dados, excluir conta (✅ Excluir já existe)
- [ ] DPO (Data Protection Officer) — pode ser founder enquanto pequeno
- [ ] Contrato com Firebase/Google: confirma processamento no Brasil ou
  cláusulas internacionais
- [ ] Termos de Serviço B2B (quando começar a cobrar empresas)
- [ ] Marca registrada **Hirly** no INPI (R$ 600 + 5 anos)
- [ ] Domínios: hirly.app, hirly.com.br, hirly.com (verificar disponibilidade)

### 16.3 Riscos legais específicos

- **Falsa promessa**: não prometer "vaga garantida"
- **Discriminação**: matchar com base em curso/área é OK; gênero/etnia é
  proibido
- **Contrato CLT/Estágio**: Hirly **não é a empregadora**, apenas
  intermediadora — deixar claro nos termos
- **Spam / mensagens não solicitadas**: cumprir CASL Brasil

---

## 17. Métricas-chave (KPIs)

### 17.1 Produto

| KPI | Definição | Target Mês 6 | Target Mês 12 |
|---|---|---|---|
| MAU | Usuários ativos mensais | 5.000 | 25.000 |
| DAU/MAU | Stickiness | 25% | 35% |
| D1 / D7 / D30 retention | Retenção pós-instalação | 50% / 30% / 15% | 60% / 40% / 20% |
| Vagas curtidas / sessão | Engajamento no feed | 5 | 8 |
| Taxa de conclusão de onboarding | Quanto % termina os 6 passos | 60% | 75% |
| Taxa de candidatura por vaga curtida | % que clicam "Candidatar" depois | 25% | 40% |

### 17.2 Negócio

| KPI | Definição | Target Mês 12 |
|---|---|---|
| Empresas pagantes (paid B2B) | Plano Starter+ ativos | 50 |
| MRR (Monthly Recurring Revenue) | Receita recorrente mensal | R$ 35-40k |
| Churn mensal B2B | % que cancela/mês | <8% |
| CAC pago | Custo médio de aquisição B2B | R$ 800-1.500 |
| LTV / CAC ratio | Saúde da economia | 3x+ |
| Vagas no banco | Total ativo no Firestore | 1.000+ |

### 17.3 Saúde técnica

- Crash-free rate: 99.5%+
- API latency p95 < 500ms (Firestore queries)
- Build size iOS < 50MB
- App Store rating: 4.5+

---

## 18. Roadmap 12-18 meses

### Q3 2026 (Jun-Ago) — Alfa & Beta privado
- [ ] App icon + splash profissional
- [ ] Submeter TestFlight + Play Store beta
- [ ] 500 usuários convidados
- [ ] Painel admin pra sócios adicionarem vagas
- [ ] Parser IA de vagas (texto → Job estruturado)
- [ ] Pitch generator (cover letter via IA)
- [ ] Analytics (Firebase Analytics) + Sentry
- [ ] Marca registrada INPI

### Q4 2026 (Set-Nov) — Beta público & first revenue
- [ ] Lançamento público nas lojas
- [ ] Campanha Instagram + TikTok orgânica
- [ ] Match explainer cacheado (IA)
- [ ] CV coach
- [ ] Resumo de vaga (3 bullets)
- [ ] Painel B2B básico (empresas postam vagas)
- [ ] Primeiras 20 empresas pagantes (plano Starter)
- [ ] 5k MAU

### Q1 2027 (Dez-Fev) — Scale & funding
- [ ] Plano Pro pra candidato (premium)
- [ ] Plano Enterprise B2B
- [ ] 25k MAU
- [ ] Captação pre-seed (R$ 300-500k)
- [ ] Time: 4-6 pessoas
- [ ] Compartilhamento de vaga + viralização
- [ ] Mock interview com IA

### Q2 2027 (Mar-Mai) — Liderança regional
- [ ] 50-100k MAU
- [ ] Time: 8-12 pessoas
- [ ] Expansão pra RJ + MG + RS
- [ ] Push notification inteligente (com IA personalizada)
- [ ] PR national (TV, jornal)
- [ ] Início de captação seed (R$ 2-5M)

---

## 19. Pendências para preencher

> Estas são as informações que faltam para fechar o plano. Por favor me
> passe que eu atualizo este documento.

### 19.1 Identidade da empresa
- [ ] **Razão social / nome da PJ** (Hirly Tecnologia Ltda? ME? alguma?)
- [ ] **CNPJ** (se já constituído) — ou data prevista de constituição
- [ ] **Endereço de sede** (se aplicável)
- [ ] **Banco / conta empresarial**
- [ ] **Marca registrada no INPI?** (status do pedido)
- [ ] **Domínios registrados?** (hirly.app, hirly.com.br, hirly.com)
- [ ] **DPO designado?** (nome + contato)

### 19.2 Time
- [ ] **Founder principal** — nome completo, CPF (uso interno), papel, %
- [ ] **Sócios** — nomes, papéis, %, vesting agreement existe?
- [ ] **Conselheiros / advisors** — se houver
- [ ] **Acordo de sócios** (quotaholders agreement) assinado?

### 19.3 Capital & finanças
- [ ] **Capital social atual**
- [ ] **Investimento já feito** (quanto cada sócio colocou)
- [ ] **Caixa disponível** (R$ líquido pra operar)
- [ ] **Runway atual** (em meses, no nível de gasto de hoje)
- [ ] **Salário founder** (está pagando alguma coisa? ou full bootstrap?)
- [ ] **Decisão de pricing B2B** (Opção A, B, C ou D da seção 9.2?)
- [ ] **Decisão sobre Hirly Pro** (lançar quando? que preço?)

### 19.4 Estratégia
- [ ] **Data-alvo de lançamento público** nas lojas
- [ ] **Cidades-foco do lançamento** (só SP? Brasil inteiro de cara?)
- [ ] **Universidades parceiras** já contactadas
- [ ] **Lista de empresas-alvo** (pra outbound B2B)
- [ ] **Plano de captação** — bootstrap, FFF, anjo, aceleradora?

### 19.5 Operações
- [ ] **Volume atual de vagas** por sócio/canal (quem traz quantas?)
- [ ] **Tempo gasto por semana** em curadoria hoje
- [ ] **Ferramentas em uso** (Slack? Notion? Linear?)
- [ ] **Contador** — quem cuida da contabilidade?
- [ ] **Escritório de advocacia** — para LGPD, contratos B2B, marca?

### 19.6 Histórico
- [ ] **Quando o projeto começou?** (data de início efetivo)
- [ ] **Por que esse nome "Hirly"?** (história da marca pra pitch)
- [ ] **Experiência prévia dos fundadores** (LinkedIn dos founders)
- [ ] **Validação que já fizeram?** (pesquisas, entrevistas com usuários)
- [ ] **Pivots anteriores** e aprendizados, se houver

### 19.7 Métricas atuais
- [ ] **Usuários reais já testando?** Quantos?
- [ ] **Feedback dos primeiros usuários** — o que dizem?
- [ ] **Taxa de conclusão de onboarding em testes**?
- [ ] **Vagas no banco hoje** (70+ confirmados; quantos exatamente?)

### 19.8 Outros
- [ ] **Concorrentes que você já viu/usou** e o que achou
- [ ] **Pessoas-chave** que você já conhece no mercado (RHs, recrutadores, founders de afins)
- [ ] **Material de marca pronto?** (logo SVG, manual de marca, fotos da equipe)
- [ ] **Pitch deck atual** — existe?

---

## Histórico de versões

- **1.0** (Maio 2026) — Versão inicial montada a partir do código e
  contexto técnico do projeto. Várias seções dependem de input do founder
  para serem finalizadas.

---

*Documento gerado para uso interno. Não compartilhar fora do círculo
fundador / advisors / potenciais investidores sob acordo de
confidencialidade.*
