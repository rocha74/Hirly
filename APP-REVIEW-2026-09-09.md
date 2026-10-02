# Hirly — revisão geral de código e produto

Data: 2026-09-09. Base: `97b3f79`, branch `codex/preparacao-piloto`.
Revisão e correções locais; sem deploy, push, envio de candidatura ou exclusão de conta real.

## 1. Veredito direto

O app tem uma base útil, mas **não está pronto para lançamento público nem para
piloto com currículos reais sem resolver os bloqueadores abaixo**.

As correções desta revisão melhoram perda de estado, concorrência, isolamento de
contas e funcionamento do Expo. Testes verdes não demonstram envio automático
operacional nem provam ausência de falhas de segurança.

## 2. O que está bom

- Domínios de match, pacote, fila e sessão externa separados e testáveis.
- Pacotes com fontes e revisão; informações ausentes não precisam ser inventadas.
- Backend como autoridade para pacote/sessão; contratos automáticos privados.
- Consentimento específico para análise de currículo e revisão dos dados extraídos.
- Identidade visual consistente: fundo escuro, cor de ação reconhecível e componentes comuns.
- Gate local com tipos, lint, testes, emuladores, auditoria de vagas, build do site e Expo Doctor.

## 3. O que estava errado — correções entregues

Prioridade P1: dados, privacidade ou fluxo principal. P2: robustez, configuração ou clareza.

| Prioridade | Problema observado no código | Correção e evidência |
| --- | --- | --- |
| P1 | Refresh do perfil desmontava navegação durante cadastro/revisão do CV | Bootstrap separado do refresh; perfil preservado somente em falha de rede; erros de permissão não mascarados; testes AuthProvider |
| P1 | Callback antigo podia confirmar candidatura após troca de conta | Verificação de UID real e do contexto; timers cancelados; testes ApplicationFlowProvider |
| P1 | Retorno de IA, pacote, fila e sessão podia chegar à conta seguinte | Guarda de sessão antes de retornar/cachear; fallback restrito a falha de conectividade; testes private-service-session |
| P1 | Edição/rejeição concorrente podia ser sobrescrita por cache/aprovação | Transação confere revisão e estado; testes de corrida do pacote |
| P1 | Worker de geração antigo podia publicar depois de perder a vez | Lease por pacote e identidade da tentativa conferidas antes de persistir |
| P1 | Sessão concluída podia reabrir ou perder checklist em atualização concorrente | Escrita transacional com comparação do estado; erro STALE_SESSION recuperável |
| P1 | Exclusão de anexo podia aparentar sucesso mesmo com arquivo ainda no Storage | Remover arquivo antes dos metadados; falhas deixam referência para retry |
| P1 | Exclusão do CV antigo podia apagar metadados de upload recente de outro dispositivo | Transação compara o caminho atual antes de remover metadados |
| P1 | Contratos aceitavam evidência posterior ao aceite ou comprovante sem tentativa | Validação cronológica de documento/resposta/formulário/tentativa; dados sensíveis não podem ser reclassificados como comuns |
| P1 | Expo não abria em desenvolvimento por falta de react-refresh/babel | Dependência direta compatível e teste de transformação Babel web/iOS/Android; abertura real confirmada |
| P1 | New Architecture desativada com Reanimated 4 | Configuração habilitada e gate de compatibilidade; exportação das três plataformas |
| P2 | Curtida legada ficava presa em memória após descurtir | Likes e candidaturas acompanham alterações por listener; teste de descurtida |
| P2 | Feed repetia paginação falha e prompts apareciam sobre outra tela | Retry explícito, guarda de foco e cancelamento de impressão; testes de recuperação do feed |
| P2 | Cadastro podia continuar durante upload ou analisar URI removida | Ações bloqueadas durante upload e referência limpa quando documento muda; testes CVUpload |
| P2 | Sessão assistida ficava em loading infinito após erro | Erro com tentar novamente/atualizar materiais; reabertura do destino; testes de tela |
| P2 | Abrir o PDF marcava o anexo externo como concluído | Abrir documento não confirma que foi anexado no site; teste de regressão |
| P2 | Dois dispositivos podiam exceder limite de anexos | Limite de cinco validado na transação, não apenas no contador da tela |
| P2 | Fallback podia enviar PDF para bucket diferente do usado para ler/excluir | Upload usa exclusivamente o bucket configurado; MIME ausente do seletor não rejeita PDF por extensão válida |
| P2 | Timeout de IA cobria headers, não leitura do corpo | Prazo cobre resposta completa e libera a cota; teste de corpo travado |
| P2 | “Adiar” podia alterar candidatura já em sessão externa | Transação limita estados elegíveis |
| P2 | App de teste podia registrar links públicos de produção | Links hirly.app apenas em produção; dev/staging usam schemes próprios |
| P2 | Nome de ambiente herdado do protótipo podia passar no lookup | Validação por propriedade própria; testes de nomes inválidos |
| P2 | Site inteiro dependia da configuração Firebase da exclusão | Firebase carregado sob demanda; páginas públicas abrem sem essa configuração; sessão de exclusão só em memória e app separado |
| P2 | Scanner do CI podia ignorar histórico e HEAD destacado do PR | Checkout completo, varredura inclui HEAD e falha quando objeto é ilegível; teste em repositório temporário |
| P2 | Percentual de dados avaliados era apresentado como “confiança” | Rótulo separado de cobertura no card, detalhe e selecionadas; cálculo do match preservado |

A exigência de New Architecture vem também da documentação oficial de
[Reanimated 4](https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/).
Exportar JavaScript não substitui compilar e testar o binário nativo.

## 4. Riscos reais ainda abertos

### Bloqueadores

1. **Exclusão concorrente incompleta.** Operação já iniciada pode recriar dados
   depois de `deleted: true`. Reproduzido com handlers reais em memória. Precisa
   de barreira de ciclo de vida em backend/Rules/Storage, não um remendo isolado.
   Plano: `ACCOUNT-DELETION-LIFECYCLE-PLAN.md`.
2. **Ambiente real não certificado nesta revisão.** Configuração, implantação,
   índices, App Check nativo, URLs públicas e contas/lojas dependem de validação.
   A correção App Check do commit `15684db` foi preservada; os testes de opções
   continuam passando. Não ative enforcement de Storage sem validar uploads REST.
3. **Envio oficial ainda ausente.** Fundação, fingerprints e estados não enviam
   uma candidatura. Não usar botão ou comunicação que prometa automação universal.
4. **Documentos legais ainda são rascunhos**, inclusive no site visualizado.
   Revisão profissional, identidade, contato e políticas operacionais pendentes.
5. **Credenciais antigas:** revogação continua sem confirmação. Scanner sem achados
   não prova que uma chave exposta no passado deixou de funcionar.

### Robustez e dívida técnica

- Firestore e Storage não compartilham transação. Compensação do cliente pode
  falhar; precisa de limpeza durável de órfãos, com retenção definida.
- PDFs são filtrados por tipo/tamanho, mas extensão/MIME não validam conteúdo.
  Antes de envio oficial, validar bytes e preservar snapshot material aprovado.
- CV aberto por URL de download com token pode ser compartilhado por quem a recebe.
  Preferir download autenticado/local ou acesso de curta duração no desenho robusto.
- Perfil e acompanhamento manual permanecem editáveis pelo cliente. Revalidar
  no backend tudo o que participa de envio, consentimento e comprovante.
- `npm audit --omit=dev`: app tem **17 moderados e 10 altos**; Functions,
  **9 moderados**, sem críticos reportados. Achados de dependências não são prova
  de exploração do app. Tratar upgrades e caminhos expostos em fase própria,
  sem `audit fix --force` que quebre o Expo.
- Os listeners de compatibilidade corrigem o histórico, mas aumentam leituras.
  Planejar migração progressiva e remover duplicação só após medir e reconciliar legados.
- Catálogo de teste não valida relevância, cobertura nem utilidade do match.
  Não foi usado como evidência de oferta real nesta avaliação.

## 5. O que falta saber e testar

### O que foi validado

- `beta:check` completo passou com Java 21: secrets, TypeScript, lint, suíte de
  testes, jobs audit, 30 cenários de Rules, store check, site e Expo Doctor (18/18).
- Exportação Expo web, iOS e Android concluída em diretório temporário.
- Babel de desenvolvimento resolve dependências nas três plataformas.
- App web abriu boas-vindas, login e cadastro no navegador local.
- Site de produção compilou sem Firebase configurado e abriu Política e
  exclusão de conta sem falha global. Nenhum formulário destrutivo foi enviado.
- Varredura do histórico Git e verificação de lockfile executadas separadamente.

Totais após as correções finais: **279 testes** de unidade/integração
(133 Jest, 106 Functions e 40 dos demais fluxos), mais **30 cenários de Rules**:
**309 aprovados**, sem testes pulados. Tipos, lint e scanner local reexecutados
após as últimas correções de sessão e rótulos.

### Não validado

- Binário assinado, gestos, teclado, leitor de tela, fontes ampliadas, retorno
  de navegador e uploads reais em iPhone/Android.
- Renderização de todas as telas autenticadas com conta de teste. Esta revisão
  combinou código e testes de componentes; não alegamos percorrer todo o app em aparelho.
- Validade de chaves, qualidade real de respostas de IA e operação das Functions
  implantadas. Os testes de IA usam respostas simuladas, não currículos pessoais.
- ATS com acesso autorizado, recebimento pelo recrutador ou candidatura real.
- Ausência de vulnerabilidades além dos cenários e superfícies revisados.

## 6. Melhor próximo passo

### Frontend — ordem recomendada, não redesign implementado

1. **Simplificar o caminho de candidatura.** Uma ação principal e destino claro;
   resumo + pendências reais. Carta, pitch, fontes e checklist ficam secundários.
   Se o Hirly não conhece o formulário, não obrigar preparação genérica.
2. **Alinhar o onboarding ao piloto.** Estágio/SP e as três áreas definidas;
   preservar multisseleção, mas não expor cobertura que o catálogo não oferece.
   Hoje “Operações/estratégia/projetos” não é opção clara na lista geral.
3. **Progresso honesto.** A shell mostra 4 etapas, mas Preferências, CV e MatchIntro
   reutilizam etapa 4 e a revisão do CV usa outro total. Mostrar fase real ou
   retirar porcentagem das telas opcionais; não ficar “100%” por várias telas.
4. **Card mais simples.** Título, empresa, local/modalidade, bolsa e salvar/ver
   detalhes. Explicação do match e cobertura de dados nos detalhes. Não aumentar
   quantidade de indicadores para parecer mais inteligente.
5. **Perfil orientado à próxima ação.** Mostrar o próximo campo útil a completar;
   reduzir destaque das ferramentas sem uso comprovado. Evitar repetir o percentual
   de completude. Preferir “Salvas”, “competências” e “currículo” a jargão misturado.
6. **Consistência e acessibilidade.** Padronizar confirmação/erro com modais
   discretos, foco correto e cancelamento claro; manter segurança em ações destrutivas.
   O checkbox legal atual já não exige abrir links só para desbloquear o aceite.
   A aceitação para IA continua separada da candidatura.
7. **Web responsiva se for canal de uso.** Formulários de login/cadastro hoje
   esticam na largura desktop. Limitar largura e centralizar, sem mudar o layout
   móvel às cegas. Validar redução de movimento e navegação por teclado.

### Backend — ordem recomendada

1. Resolver exclusão concorrente integral e provar em staging com dados sintéticos.
2. Consolidar upload/documentos com validação de conteúdo, órfãos e snapshots privados.
3. Validar configuração real, quotas, monitoramento sem PII, alertas e rollback.
4. Implantar modo assistido simples; medir tempo ativo total e conclusão correta.
5. Implementar um único canal oficial autorizado com formulário real, consentimento,
   outbox idempotente, comprovante e reconciliação; só depois ampliar integrações.
6. Atualizar dependências em faixa compatível ou migração nativa separada, com testes.

### Decisão de produto

Piloto: perfil uma vez, materiais reutilizáveis e conclusão assistida sem burocracia.
Público: envio em um toque para integrações autorizadas; assistido para o restante.

Plano detalhado, dependências e critérios de sucesso:
`HIRLY-APPLY-PILOT-AND-PUBLIC-PLAN.md`.

## 7. Nível de confiança

Alto nas falhas reproduzidas e correções cobertas por regressão. Médio no desenho
de produto. Não sabemos ainda quanto tempo ele economiza no mundo real.
Revisão ampla não é certificação de segurança nem garantia de app sem bugs.
