# Auditoria de UX — Hirly Apply

Data: 2 de agosto de 2026

## Escopo e método

Foram auditadas as quatro superfícies da jornada autenticada:

1. `Selecionadas para você`;
2. revisão do pacote;
3. Central de candidaturas;
4. candidatura assistida.

A análise combinou inspeção dos componentes, estados, mensagens de erro,
transições e uma verificação do shell web em viewport móvel de 390 × 844 px. O
ambiente local não possuía uma sessão autenticada com dados de candidatura; por
isso, a inspeção das telas privadas foi feita pelos estados renderizados e seus
testes, sem criar dados profissionais fictícios.

## Medição do fluxo anterior

### Caminho feliz pela seleção diária

```text
Selecionadas -> Revisão -> Assistência -> site externo -> Central
```

- 4 telas da Hirly, contando a Central de resultado, além do site externo.
- 5 toques mínimos: preparar, aprovar, fechar confirmação de aprovação,
  continuar para o site e confirmar envio ao retornar.
- Até 4 expansões adicionais para conferir pitch, carta, respostas e checklist.
- 7 seções competiam pela atenção na revisão, embora a maioria fosse secundária.

### Caminho pela Central

- Cartões exibiam motivo, risco, cinco métricas, status, próxima ação e quatro
  comandos ao mesmo tempo.
- Um item com pendência ainda oferecia “Aprovar”; o usuário só descobria o
  bloqueio depois do toque.
- A próxima ação aparecia depois das métricas.

## Problemas encontrados e prioridade

| Prioridade | Problema | Risco para o usuário | Mudança |
| --- | --- | --- | --- |
| P0 | Risco que exigia confirmação não tinha ação para ser confirmado | pacote impossível de aprovar | ação “Confirmar que li”, persistida e rastreável |
| P0 | Domínio externo não aparecia antes de continuar | destino pouco transparente | domínio mostrado na revisão, Central e assistência |
| P0 | Confirmação final ficava no fim de uma tela longa | abandono ou confirmação perdida | ação principal fixa no rodapé |
| P1 | Aprovação exigia alerta e novo toque para abrir a assistência | esforço repetido | “Aprovar e abrir site”, sem enviar automaticamente |
| P1 | Revisão começava com duas seções extensas abertas | leitura excessiva | resumo primeiro; detalhes secundários ocultos |
| P1 | Para ver todo o conteúdo eram necessárias várias expansões | revisão lenta | “Ver tudo que foi preparado” abre todas as seções |
| P1 | Cartões da Central eram longos e a próxima ação aparecia tarde | decisão lenta | próxima ação no topo e detalhes recolhidos |
| P1 | Item com pendência oferecia aprovação | erro previsível | CTA passa a “Resolver pendências” |
| P2 | Textos como “cache”, “score estruturado” e “sincronização” | aparência técnica e assustadora | linguagem orientada à tarefa e recuperação |
| P2 | Não estava explícito em cada texto quando a IA atuou | baixa confiança | indicação “Texto organizado pela IA” junto das fontes |
| P2 | Ranking numérico na seleção diária | ruído visual | ordem mantida sem marcador de competição |

## Informações solicitadas

O caminho sem pendências não pede novos dados. Quando falta informação, a tela
solicita somente os itens bloqueantes já produzidos pelo gerador. Respostas
sensíveis continuam manuais e nunca são presumidas. A confirmação de risco agora
é uma decisão explícita, sem solicitar texto redundante.

## Estados e erros

Os estados mais confusos eram “pacote aprovado” versus “candidatura enviada” e
mensagens de sincronização. A revisão e a Central agora repetem que:

- aprovar abre a assistência, mas não envia;
- o domínio de destino é conhecido antes da saída;
- apenas a confirmação após o envio no site registra a candidatura;
- falhas preservam o pacote e informam uma próxima ação segura.

## Fluxo depois das mudanças

### Sem pendências

```text
Selecionadas
  1. Preparar candidatura
Revisão resumida
  2. Aprovar e abrir site da empresa
Site externo + assistência
  3. Confirmar que enviei
Central com candidatura registrada
```

- Mesmas superfícies de transparência, mas 3 toques mínimos em vez de 5.
- Nenhuma expansão obrigatória no caminho rápido.
- Uma única ação abre todos os detalhes e fontes quando o candidato desejar.
- A ação principal permanece visível durante o preenchimento externo.

### Com pendências

```text
Central -> Resolver pendências -> responder/confirmar item
        -> resumo atualizado -> aprovar e abrir site
```

O usuário não tenta aprovar para só então descobrir o bloqueio.

## Critério da revisão em dois minutos

Quando não há pendências ou riscos que exijam ação, a primeira dobra contém:

- vaga e empresa;
- próxima ação;
- aviso de que nada foi inventado;
- materiais preparados;
- destino externo;
- botão de aprovação fixo.

Os detalhes continuam disponíveis e editáveis, mas não são impostos como leitura
sequencial. Isso torna plausível concluir a revisão em menos de dois minutos sem
reduzir transparência ou consentimento.
