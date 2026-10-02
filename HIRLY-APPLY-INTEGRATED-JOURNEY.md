# Hirly Apply — jornada integrada

## Fonte de verdade

A jornada possui uma máquina de estados explícita em
`functions/shared/applyJourneyState.js`. Pacote, item da fila e sessão externa
continuam sendo módulos separados; o estado da jornada é derivado deles com a
seguinte precedência: candidatura registrada, expiração, recusa, sessão externa,
fila, pacote e recomendação.

O frontend contém somente a projeção de apresentação da mesma máquina em
`src/features/apply/domain/journey.ts`. Transições sensíveis são validadas no
backend, não na interface.

## Diagrama textual da jornada

```text
fontes de vagas + preferências + currículo
                  |
                  v
       [descoberta e triagem diária]
                  |
                  v
        Selecionadas para você
                  |
          Preparar candidatura
                  |
                  v
       [gerador modular + proveniência]
                  |
          +-------+--------+
          |                |
     faltam dados       pacote pronto
          |                |
          +-------> Central de candidaturas
                           |
                revisão individual ou lote
                           |
                        aprovação
                           |
                           v
                [sessão externa genérica]
                           |
             copiar materiais / anexar CV
                           |
                 confirmação explícita
                           |
                           v
              candidatura registrada
                           |
          removida da seleção + próxima ação
```

## Máquina de estados

```text
discovered
  -> shortlisted
  -> package_generating              (atalho compatível com o feed legado)
  -> rejected | expired

shortlisted
  -> package_generating | rejected | expired

package_generating
  -> package_needs_information | package_ready | failed | expired

package_needs_information
  -> package_generating | package_ready | rejected | expired

package_ready
  -> package_generating | approved | rejected | expired

approved
  -> external_pending
  -> package_ready | package_needs_information  (edição invalida a aprovação)
  -> package_generating | rejected | expired

external_pending
  -> external_in_progress | submitted | failed | expired

external_in_progress
  -> external_pending | submitted | failed

failed
  -> package_generating | approved | external_pending | rejected | expired

submitted | rejected | expired
  -> estado terminal
```

## Invariantes

- `submitted` exige confirmação explícita do candidato e não regride.
- A conclusão externa compara `session.packageRevision`, `package.revision` e
  `package.approvedRevision`; divergência produz `STALE_PACKAGE` e não envia.
- Aprovação de vaga expirada é bloqueada.
- Edição ou regeneração incrementa a revisão e remove a aprovação anterior.
- O envio grava sessão, pacote, fila, candidatura e interação na mesma transação.
- O ID de sessão externa é determinístico: `{jobId}:{packageRevision}`.
- A geração usa lease por candidato/vaga. Chamadas repetidas reutilizam a execução;
  uma geração órfã pode ser retomada após a expiração do lease.
- Ações de fila usam `actionId`; repetição da mesma ação devolve o resultado salvo.
- Qualquer item ativo na fila deixa de participar das recomendações. Recusados
  permanecem no histórico e não reaparecem na seleção imediata.
- Nenhuma aprovação equivale a envio externo; o registro só nasce após a
  confirmação `submitted`.

## Recuperação e falhas

| Situação | Comportamento |
| --- | --- |
| múltiplos toques em preparar | lease deduplica a geração |
| app fechado durante geração | tela consulta novamente; lease expirado permite retomada |
| falha parcial da IA | pacote `failed` ou `package_needs_information`, sem envio |
| offline | estado persistido no Firestore continua sendo a fonte de verdade |
| abertura do site sincronizou tarde | confirmação explícita ainda conclui a sessão pendente |
| edição simultânea | transação compara a revisão esperada e retorna `STALE_PACKAGE` |
| pacote editado após aprovação | aprovação é removida e a sessão antiga não pode concluir |
| envio repetido | candidatura/sessão concluída retorna `duplicate: true` |
| vaga expirada | transição para aprovação/início externo é recusada |

## Próxima ação

Cada estado tem uma projeção de próxima ação: preparar, aguardar, completar dados,
revisar, iniciar ou concluir o fluxo externo, tentar novamente, acompanhar a
candidatura ou explorar novas vagas. A Central de candidaturas mostra essa ação
em cada cartão.
