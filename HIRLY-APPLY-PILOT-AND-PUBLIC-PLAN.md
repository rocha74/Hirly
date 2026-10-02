# Hirly Apply — piloto e lançamento público

Revisão: 2026-09-09. Proposta de produto e execução; não é funcionalidade entregue.
Complementa `HIRLY-APPLY-ONE-TAP-IMPLEMENTATION.md` e não altera os parâmetros do piloto.

## 1. Veredito direto

A melhor alternativa é híbrida: **preparação reutilizável + envio oficial onde
houver acesso autorizado + assistência simples no restante**.

Não investir agora numa promessa de candidatura automática universal. Aceitar
o envio no Hirly não concede acesso à API do recrutador nem elimina perguntas,
login, testes ou CAPTCHA do site externo.

Para o piloto, o Apply deve economizar trabalho, não criar uma segunda
candidatura antes de o usuário preencher a primeira no site da empresa.

## 2. O que está bom

Fatos do código local:

- Perfil, CV, pacote com proveniência, revisão, fila e respostas aprovadas existem.
- O modo assistido permite copiar materiais, abrir o destino e retomar a sessão.
- Confirmação manual é separada da simples abertura do site.
- Há contratos de formulário, consentimento, snapshots e tentativa de envio,
  com coleções automáticas protegidas contra escrita do cliente.
- O gerador atual do pacote é determinístico; a base não precisa ser reescrita.

## 3. O que está errado ou frágil

- **Contrato não é integração:** não há adaptador de envio oficial operacional
  no código revisado. O genérico declara `manual_assist` e não preenche o ATS.
- Perguntas preparadas pelo Hirly não são necessariamente as perguntas reais
  da vaga. Carta, pitch e revisão genérica podem aumentar o trabalho sem benefício.
- Respostas reutilizáveis ainda precisam de autorização explícita de reutilização,
  escopo, validade e interface de edição/revogação.
- Os contratos de snapshots não preservam, sozinhos, os bytes aprovados. Trocar
  o CV atual pode remover o PDF anterior.
- `applications` legada aceita escrita do cliente. Ela é acompanhamento manual,
  não fonte de prova de envio oficial.
- Não sabemos quais ATS predominam nas vagas relevantes do catálogo real.
  Escolher fornecedor pela facilidade técnica antes disso pode produzir cobertura inútil.

## 4. Riscos reais e dependências externas

### Canais oficiais verificados

| Canal | Evidência pública | Consequência para o Hirly |
| --- | --- | --- |
| Greenhouse | GET público; POST exige chave Job Board do empregador; perguntas disponíveis no detalhe | Precisa de parceiro e validação própria dos campos obrigatórios; a API não a faz por completo |
| Ashby | Formulário estruturado; envio exige permissão `candidatesWrite`; detalhe usa `jobsRead` | Candidato técnico possível se houver empresa parceira e acesso de menor privilégio |
| Lever | Envio exige chave da empresa; Postings API não expõe perguntas customizadas | Não assumir cobertura completa de formulários; sem fonte completa, usar formulário hospedado |
| Gupy | Documentação consultada não confirmou endpoint autorizado de envio pelo candidato | Modo assistido até comprovar canal, contrato e acesso; não afirmar que a integração é impossível |

Fontes oficiais consultadas em 2026-09-09:
[Greenhouse Job Board](https://docs.greenhouse.io/job-board.html),
[Lever Postings API](https://github.com/lever/postings-api),
[Ashby: envio](https://developers.ashbyhq.com/reference/applicationformsubmit),
[Ashby: formulário](https://developers.ashbyhq.com/reference/jobpostinginfo),
[Gupy: documentação](https://developers.gupy.io/reference/introduction).

A disponibilidade técnica pública não prova que a Hirly tenha autorização,
credencial, contrato ou cobertura comercial. Nada foi submetido a esses serviços.

### Riscos que não podem ser escondidos pela interface

- Timeout após transmissão pode significar que o ATS recebeu. Nunca reenviar
  cegamente: manter `unknown` e reconciliar.
- Resposta positiva do endpoint não garante que todos os campos chegaram certos.
  Validar também a ficha visível ao recrutador no ambiente autorizado de teste.
- Dados sensíveis, pretensão salarial, disponibilidade e declarações pessoais
  não podem ser deduzidos pela IA. Ausência de resposta é pendência, não convite para inventar.
- Fila que envia dias depois pode usar vaga encerrada, formulário ou consentimento
  desatualizado. Revalidar antes do envio e pedir nova aprovação quando houver mudança.
- Concorrência na exclusão de conta ainda é bloqueador para dados reais; ver
  `ACCOUNT-DELETION-LIFECYCLE-PLAN.md`.

## 5. O que falta saber

1. Distribuição dos ATS nas 45 vagas reais do piloto, sem contar as vagas de teste.
2. Quais empresas aceitariam integração ou receberiam candidaturas diretamente pela Hirly.
3. Tempo ativo e erros atuais ao preencher candidaturas no celular, incluindo o site externo.
4. Acesso autorizado a sandbox, formulários reais de teste e verificação do lado recrutador.
5. Configuração e implantação de staging, segurança, orçamento e responsáveis operacionais.

## 6. Melhor próximo passo — sequência de execução

### Etapa A — segurança e estabilidade antes dos currículos reais

1. Implementar o ciclo de exclusão completo: bloquear novas escritas e operações
   tardias, limpar arquivos, suportar retry e provar ausência de recriação de dados.
2. Implantar e validar Rules, índices e Functions em staging separado; testar
   App Check no build nativo, inclusive upload REST, antes de ativar enforcement.
3. Concluir identidade e revisão dos documentos legais, revogação de credenciais
   antigas e canais de suporte. Esta análise técnica não certifica conformidade jurídica.
4. Testar o roteiro nativo em iPhone e Android: upload, falha de rede, troca de
   conta, navegador externo, retomada e exclusão. Sem usuários reais nesta etapa.

Saída: ambiente testado, dados isolados, exclusão demonstrada e nenhuma promessa
de envio que o backend não cumpra.

### Etapa B — piloto de baixo atrito

Manter os 24 participantes definidos: 12 Administração e 12 Economia, instituições
privadas, São Paulo/SP, estágio nas três áreas de `PILOTO-PARAMETROS.md`.

Fluxo proposto:

1. Perfil preenchido uma vez, CV opcional com revisão dos dados extraídos.
2. Vaga mostra claramente **“Concluir no site da empresa”** quando não há integração.
3. Materiais já disponíveis ficam acessíveis por ação secundária: dados para copiar,
   currículo para salvar/compartilhar e respostas úteis já confirmadas.
4. Não exigir carta, pitch, questionário genérico ou aprovação de pacote para
   apenas abrir um formulário externo. Preparar material só quando trouxer valor.
5. Se faltar informação real conhecida, perguntar somente isso. Se o formulário
   não é conhecido, informar a limitação em vez de fingir pacote completo.
6. Ao retornar, oferecer uma confirmação discreta, dispensável e retomável.
   Registrar “Envio informado por você”, nunca “Recebido pela empresa”.
7. Oferecer “Usar esta resposta novamente” separado da aprovação desta candidatura;
   permitir revisar/apagar essa memória. Não reutilizar automaticamente dados sensíveis.

Manter leitura de currículo, fila e sessão existentes; simplificar o caminho
principal. Não incluir no piloto extensão, CAPTCHA automático ou credenciais de ATS.

**Alternativa opcional, não pré-requisito:** empresa parceira pode aceitar candidatura
nativamente na Hirly. Isso reduz muito o trabalho do candidato, mas exige acordo,
canal de recebimento, confirmação real, suporte e controle de acesso do recrutador.
Não chamar e-mail ou entrega interna de `official_api` do ATS. Se adotado, criar um
contrato próprio de entrega; não encaixar silenciosamente nos modos existentes.

Concierge humano pode servir para observação assistida, com autorização e canal
definidos, mas apenas transfere trabalho para a equipe. Não demonstra escalabilidade.

### Etapa C — primeiro envio oficial completo

Escolher **uma empresa parceira e um provedor** que cubram vagas úteis ao público.
Preferir completude do formulário e prova de recebimento à quantidade de logos integradas.

Ordem técnica:

1. **Adaptador de formulário:** buscar perguntas reais e IDs, tipos, opções,
   limites, documentos, versão, fingerprint, validade e situação da publicação.
   Pergunta ou tipo não suportado leva ao assistido, não é omitido.
2. **Resposta e proveniência:** mapear fatos confirmados; validar cada valor
   contra o formulário; textos sugeridos não acrescentam experiência inexistente.
3. **Documentos materiais:** copiar bytes aprovados para snapshots privados
   imutáveis, verificar hash/tamanho/tipo e retenção. Alterar o CV principal não
   modifica o documento desta candidatura. Validar conteúdo, não só extensão/MIME.
4. **Resumo:** empresa, vaga, destino, CV/anexos e apenas pendências. Detalhes
   expansíveis. Botão “Aprovar e enviar” somente quando esse envio é suportado.
5. **Consentimento no servidor:** ligar identidade, vaga, empresa, provedor,
   formulário, revisão, respostas, documentos, payload, texto e horário exatos.
   Aprovação perde validade se qualquer conteúdo aprovado mudar.
6. **Outbox transacional:** persistir consentimento + tentativa + item a processar
   sem intervalo de perda. Cliente não escreve estado oficial e não escolhe UID.
7. **Worker:** lease, prazo, limite de tentativas, orçamento, kill switch e
   idempotência por candidatura. Revalidar antes de transmitir; timeout ambíguo
   vira `unknown`, não falha automaticamente reenviável.
8. **Comprovante:** preservar identificador externo, destinatário, horário,
   referências/hash aprovados e origem da confirmação. Segredos e PII não vão aos logs.
9. **Reconciliação:** consultar provedor ou receber webhook autenticado quando
   suportado. Se não houver como esclarecer, fluxo operacional visível, sem
   inventar confirmação nem prometer reconciliação automática.
10. **Migração:** preservar histórico manual; expor projeções oficiais separadas
    e protegidas. Nunca promover registros legados a comprovantes.

Saída: candidatura completa aparece no sistema do recrutador autorizado, sem
duplicação em retry, com documento exato, perguntas corretas e comprovante rastreável.

### Etapa D — lançamento público

- Expandir integrações por cobertura e ganho medido, não por disponibilidade de SDK.
- Separar filas/limites por provedor e empresa; monitorar latência, rejeições,
  resultados desconhecidos e custo por candidatura recebida.
- Definir responsável e procedimento para incidentes, credenciais vencidas,
  mudança de formulário, duplicação, exclusão e reconciliação manual.
- Reutilizar o assistido quando a integração cair. Explicar ao usuário a mudança
  de canal; não transformar timeout ambíguo em convite para reenviar no site.
- Manter trilha de auditoria mínima, política de retenção, exclusão e permissões
  por função. Revisar dependências e segurança em ciclos próprios.

### Testes obrigatórios do envio

- Dois toques, duas telas, dois dispositivos e retry da fila → uma candidatura.
- CV/formulário/resposta alterados ou consentimento revogado → novo aceite antes de enviar.
- Pergunta obrigatória sem fonte, opção inválida, arquivo incompatível → bloqueio explicável.
- Timeout antes e depois de o ATS aceitar → estados corretos, sem duplicação.
- Webhook duplicado/forjado e resposta externa inválida → nenhuma confirmação falsa.
- Troca e exclusão de conta durante preparo/envio → isolamento e comportamento explícito.
- Uma conta não consegue ler ou alterar documentos/consentimentos/tentativas de outra.
- Conferência lado recrutador → todos os campos e arquivos coincidem com o aprovado.

### Medir economia real

Preservar os critérios do piloto. Adicionar uma comparação observada nos primeiros
seis participantes, com tarefas equivalentes e ordem alternada entre manual e Hirly.

Medir **tempo ativo total**, inclusive no site externo; quantidade de campos
redigitados; erros; abandono; confirmação real e retorno ao produto. Não coletar
texto de respostas ou CV em analytics. Na parte externa, usar observação autorizada
ou relato, sem fingir que timestamps de abertura medem tempo de preenchimento.

Meta proposta, ainda não demonstrada: reduzir em pelo menos 30% a mediana do
tempo ativo em tarefas comparáveis, sem perda de completude, afirmações inventadas
ou duplicações. Se preparar pelo Hirly demora mais, simplificar ou retirar a etapa.
Seis pessoas detectam atrito; não provam superioridade para todo o mercado.

## 7. Nível de confiança

Alto sobre as limitações do código e a necessidade de backend autorizado.
Médio sobre o desenho híbrido como melhor caminho para este público.
Baixo sobre cobertura comercial e tempo economizado até medir o catálogo real
e observar candidatos. Nenhuma melhoria em contratação está comprovada.
