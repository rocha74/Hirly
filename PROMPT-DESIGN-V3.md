# Prompt para o Claude Design — Redesign Hirly v3

## Quem é a Hirly
**Hirly** (Hire + Early) é um app brasileiro tipo TikTok-de-vagas para jovens 18-28 anos buscando **estágio, trainee e primeiro emprego**. Feed swipe vertical com **match score personalizado**. O usuário curte com double-tap. Bundle: `com.hirly.app`.

A vibe é: **profissional como Linear, jovem como Spotify, confiável como Nubank**. Não é Tinder colorido — é uma plataforma séria de carreira que respeita o tempo e a inteligência de quem está começando.

## Stack técnico (constraints reais)
- React Native 0.81 + Expo SDK 54 (managed) — sem Skia, sem Lottie pesado
- Reanimated 4 + gesture-handler 2.28
- `@react-native-masked-view/masked-view` para gradient text
- Lucide-react-native (ícones)
- Fonts: **Geist** (display) + **JetBrains Mono** (labels/micro) + Inter (body)
- Tema **DARK forçado** (sem light mode)

## Brand atual (manter como base)
- bg primário: `#0A0612` (deep eggplant)
- cards: `#16102A`
- brand gradient diagonal 135°: `#7B5CFF` → `#3B82F6`
- brand gradient horizontal 90°: `#7B5CFF` → `#22D3EE` (textos/progress)
- accent ciano: `#22D3EE`
- accent roxo: `#7B5CFF`
- Wordmark: tile "h" gradient + "Hir" branco + "ly" gradient + dot ciano com glow

## Estado atual (v2) — telas anexas
10 screenshots: 6 do onboarding (CV upload, opportunity type, area, preferences, education, consent), GetStarted (signup), Feed (job card), JobDetail.

## Problemas reais identificados nas telas

### Bugs visuais críticos
1. **CVUpload screen** — o wordmark "hirly." está **cortado pelo header/safe area** no topo do card hero. Parece bug, não decisão.
2. **Feed card** — o avatar gigante da empresa (letra "A" branca em fundo branco) flutua sobre o header do gradient cobalt de forma **desalinhada com a logo do app no topo**. Visualmente compete pela atenção.
3. **JobDetail** — mesma issue: o "A" tampa parte do título "Programa de Estágio 2026".

### Hierarquia & polish
4. **Header do Feed** tem 3 ícones redondos (heart, filtros, avatar) que pesam demais. O avatar do usuário com gradient ring fica visualmente igual ao botão de filtros.
5. **Match badge** "27% match" parece toast cinza esquecido, perdendo a importância do feature core do app.
6. **Chips de benefícios** estão em ciano outline (`Plano médico`, `Wellhub`, `Vale refeição`, `PLR`) — todos com mesma cor/peso, sem hierarquia, parecem decoração.
7. **Bolsa auxílio** em roxo brand chama mais atenção que o título da vaga.
8. **Pagination dots** na lateral direita do feed (5 dots verticais) ficam apagados, mal sinalizam scroll.
9. **Botão "Toque 2x para curtir"** parece dica de tutorial permanente — devia desaparecer depois da 1ª interação.

### Onboarding
10. **Hero callout "Quanto mais você marcar, melhor o match"** (passo 4/6) está bonito mas o card é redundante com a logo já presente no app.
11. **Chips "Mais relevante / Menos perda de tempo"** dentro do hero card parecem botões clicáveis mas são só labels.
12. **Inputs salário** "Mínimo R$ / Máximo R$" sem indicação visual de range (devia ter slider duplo ou stepper).
13. **Cards de opção** (Estágio/Trainee/Primeiro Emprego) — selecionado tem **border roxo + texto colorido + bg roxo translucid**, mas o checkmark/indicador de seleção não é claro.
14. **GetStartedScreen** — campos sem ícone de validação, sem indicador de força de senha, botão "Criar Conta" sem loading state visível.
15. **Step 4/6 aparece duas vezes** (preferências E priorities) — sugere que o flow tem ambiguidade de hierarquia.

## O que QUERO que você redesenhe

### 1. Identidade visual elevada
- **Refine o sistema de gradients**: hoje o purple→blue está OK mas é genérico (parece Stripe, Linear, mil apps). Proponha um diferencial — pode ser uma terceira cor de acento, textura sutil (noise/grain layer), ou uso estratégico de **gradient mesh** em momentos hero.
- Mantenha o `dot ciano` como elemento de marca (ele é nosso).
- **Defina uma "marca de movimento"** — animações assinatura recorrentes (ex: spring suave nos cards, micro-shimmer no match badge, parallax sutil no card avatar).

### 2. Sistema de Match Score (feature core)
Hoje o "27% match" é uma pílula cinza apagada. Crie um sistema visual de **3-4 tiers** com identidade própria:
- **Match alto (80-100)**: gradient ciano→verde, com glow, label "Match perfeito"
- **Match médio (50-79)**: gradient roxo→azul, label "Boa compatibilidade"
- **Match baixo (0-49)**: cinza-grafite com borda sutil, label "Pouca compatibilidade"

Pense num formato que NÃO seja pílula horizontal — talvez **anel circular com %**, ou **barra de progresso vertical na lateral do card**, ou **selo geométrico** no canto.

### 3. Job Card no feed (a tela mais importante do app)
Repensar layout completo. Constraints:
- Precisa caber: logo empresa, nome empresa, título vaga, location, modalidade, contrato, salário, descrição curta, skills tags, benefícios chips, match score, indicador "swipe up", indicador "double tap to like".
- Hoje tudo briga por atenção. Quero **hierarquia clara em 3 zonas**: hero (top 40%) — visual da empresa + match; body (middle 40%) — título + meta + salário; tail (bottom 20%) — benefícios + ação.
- A letra gigante "A" branca quando empresa não tem logo precisa ser **muito mais elegante** — sugiro tile geométrico com gradient e iniciais em fonte custom, NÃO um quadrado branco genérico.
- Proponha tratamento pra **empresas sem logo** que não pareça placeholder bugado.

### 4. Header e navegação
- O header do Feed tem **logo + heart + filters + avatar** — proponha layout mais limpo. Talvez logo só + 2 ações no canto direito.
- Avatar do usuário no header com gradient ring está OK mas concorre visualmente com botões. Pense numa hierarquia.
- A app é **sem bottom tabs** — navegação é via swipe + botões no header. Não introduza tabs.

### 5. Onboarding (6 passos)
- **Progress bar atual** (6 segmentos com gradient) é boa mas pode ganhar polish: animação de preenchimento, label do passo atual em mono uppercase com tracking.
- Crie um **componente "Hero Insight Card"** unificado para callouts educacionais (ex: o card do passo 4 "Quanto mais marcar, melhor o match") — hoje cada passo tem variação. Padronize.
- **Cards de opção** (Estágio/Trainee, áreas, interesses, modalidades) — o estado selecionado precisa ser inequívoco. Use **checkmark animado**, não só border color.
- **Step indicator** ("PASSO 1 DE 6 — 17%") em mono uppercase tracking wide está show, mantenha mas considere posicionamento.

### 6. JobDetail screen
- Reduza ruído. Hoje tem header preto + área cobalt + cards empilhados = parece 3 apps colados.
- Considere **header colapsável** com parallax: a área cobalt encolhe ao scrollar e o nome da empresa migra pro app bar.
- **Botão "Candidatar-se agora"** precisa ser MAIS forte: hoje é um pill gradient padrão. Adicione lift (shadow projetada do gradient), micro-animação ao tocar, e indicação clara "vai abrir site externo".

### 7. Microinterações & feedback
- **Curtir vaga**: já tem heart pop animation no double-tap. Proponha 2-3 variações sutis pra premiar repetição.
- **Swipe-to-next**: o gesto deve ter **resistência** (rubber band) nos limites, snap firme no destino, e **shimmer de loading** entre cards.
- **Toast system**: hoje toast simples ao curtir. Proponha sistema com 3 níveis (success, info, warning) e posicionamento consistente.
- **Empty states**: quando sem vagas, sem curtidas, sem candidaturas — crie ilustrações geométricas leves (não 3D, não emoji) coerentes com a marca.

### 8. Tipografia
- Defina **escala de 8 níveis** com line-height, tracking e weight pra cada um. Hoje tem inconsistência entre telas.
- Aposte mais no **mono (JetBrains Mono)** pra elementos técnicos: salários (`R$ 1.200,00` em mono fica delicioso), match scores, IDs, timestamps, metadata.
- Tracking negativo agressivo nos display headlines é nossa assinatura — mantenha mas calibre por tamanho.

## Entregáveis esperados
1. **Moodboard / direction** (1 prancha) — referências, mood, paleta refinada
2. **Design tokens v3** (cores, gradients, sombras, blurs, radii, type scale, motion durations/easings)
3. **Componentes redesenhados** com states (default/hover/pressed/disabled/loading): Button, Input, Card, Chip, MatchBadge, ProgressBar, Toast, AvatarTile, CompanyLogoTile
4. **10 telas finais redesenhadas** (as mesmas anexas) + 2 novas (LikedJobsScreen, ProfileScreen)
5. **Animation specs**: 5-8 microinterações chave com timing/easing
6. **Empty states** (3-4 variantes)
7. **Handoff técnico**: valores exatos pra implementar em React Native (sem CSS-only tricks; tudo precisa ser viável em RN/Reanimated)

## Constraints duras
- Sem dependências novas além das listadas
- Sem ilustrações 3D ou Lottie pesado (peso final do app importa)
- Sem light mode (DARK only)
- Português BR em todas as strings
- Acessibilidade: contraste mínimo 4.5:1 em textos, áreas de toque mínimas 44pt
- Performance: assumir target de 60fps em iPhone 12+/Pixel 6+

## Filosofia
> "A Hirly é o primeiro app de carreira de alguém que cresceu no TikTok mas vai entrar no mercado corporativo. Precisa ter a velocidade do TikTok, a confiança do LinkedIn, e o respeito visual de uma marca premium. Sem ser brega, sem ser sério demais."
