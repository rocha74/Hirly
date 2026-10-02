# Hirly Design System

Sistema visual do beta para candidatos buscando estagio, trainee e primeiro
emprego.

## Direcao

- Aparencia jovem sem perder clareza operacional.
- Vagas e dados reais ocupam o primeiro plano; decoracao nao compete com o
  conteudo.
- Superficies minerais escuras organizam o app. Cards claros identificam vagas
  e criam contraste imediato no feed.
- Azul eletrico e violeta formam a identidade principal. Azul ceu e coral
  comunicam informacao e destaque sem depender de uma paleta monocromatica.
- Raios de borda limitados a 8 px, exceto controles genuinamente circulares,
  badges numericos e indicadores radiais.

## Marca

- O simbolo mantem o `h` do Hirly e adiciona um ponto violeta como assinatura.
- O bloco azul eletrico funciona em icone, adaptive icon e avatar de marca.
- O wordmark usa Geist ExtraBold em caixa baixa.
- Arquivos fonte: `assets/brand/hirly-app-icon.svg`,
  `assets/brand/hirly-adaptive-foreground.svg` e
  `assets/brand/hirly-wordmark-2026.svg`.

## Cores

| Papel | Token | Valor |
| --- | --- | --- |
| Fundo principal | `COLORS.bg` | `#080A12` |
| Superficie | `COLORS.surf` | `#151A28` |
| Papel da vaga | `COLORS.paper` | `#F6F7FC` |
| Texto no papel | `COLORS.paperInk` | `#10131D` |
| Acao principal | `COLORS.signal` | `#7482FF` |
| Informacao | `COLORS.sky` | `#58C8FF` |
| Destaque | `COLORS.coral` | `#FF7896` |
| Apoio | `COLORS.violet` | `#AC7CFF` |

Os tokens canonicos ficam em `src/theme/tokens.ts`. As constantes antigas sao
somente uma camada de compatibilidade durante a migracao.

## Tipografia

- Geist: titulos, corpo, rotulos e comandos.
- JetBrains Mono: valores, porcentagens, pequenas categorias e metadados.
- O bootstrap importa cada peso por subpath. O barrel de uma familia nao deve
  ser usado porque inclui pesos e italicos que nao aparecem na interface.
- Nenhum tamanho de fonte depende da largura do viewport.
- Letter spacing padrao: zero.

## Componentes centrais

- `Logo`: marca, simbolo e wordmark com tons claro e escuro.
- `CTA` e `Button`: acao primaria azul eletrico e alternativa neutra.
- `Input` e `SearchableSelect`: rotulos explicitos, foco visivel e alvos de
  toque estaveis.
- `ScreenHeader` e `IconButton`: cabecalhos previsiveis e comandos com icones.
- `MainDock`: Descobrir, Curtidas, Candidaturas e Perfil.
- `ScreenState`: loading, vazio e erro com a mesma hierarquia.
- `JobCard`: card de descoberta em papel, match com confianca e acao clara.
- `OnboardingShell`: quatro etapas obrigatorias com progresso consistente.

## Responsividade

- O feed e a abertura foram verificados em 390 x 844 e 320 x 568.
- A abertura usa composicao compacta abaixo de 640 px de altura.
- O `JobCard` reduz espacos e oculta chips secundarios abaixo de 760 px de
  altura, preservando titulo, salario, match e candidatura.
- Toolbars, dock, cards e indicadores usam dimensoes fixas ou constraints para
  impedir saltos de layout.

## Acessibilidade

- Comandos por icone possuem nome acessivel.
- Selecao, disabled, busy, checkbox, radio e tab expoem estado semantico.
- Acoes principais mantem alvo de toque entre 44 e 54 px.
- Textos claros e escuros usam pares de contraste definidos nos tokens.
- Informacao de estado nao depende apenas de cor.

## Regras para evolucao

- Nao reintroduzir contagens, dados ou tempos estimados sem fonte real.
- Nao colocar cards dentro de cards; use divisores e faixas para subgrupos.
- Nao usar gradientes atmosfericos, orbes ou brilho como estrutura de pagina.
- Nao exibir termos internos, fornecedores ou detalhes tecnicos ao candidato.
- Toda nova tela principal deve usar `ScreenHeader`; destinos recorrentes usam
  `MainDock`.
- Validar novos layouts em pelo menos um viewport compacto e um viewport atual
  de iPhone/Android, alem dos testes de tipos e acessibilidade.
