# Hirly Apply — descoberta e triagem diária

## Decisões

- `recommendationEngine.ts` é o núcleo puro. A ordem, os filtros e o score não dependem de IA.
- O score atual (`computeMatchScore`) é reutilizado e recebe dados enriquecidos pelas preferências do Apply e pelo currículo canônico. Cargo desejado, experiências, tipo de contrato, área, senioridade, empresa e salário geram ajustes pequenos e explícitos.
- IA é somente um `RecommendationExplanationProvider` opcional. Ela pode encurtar a explicação, mas não altera score, categoria, filtros ou ordem. Se falhar, a explicação determinística continua disponível.
- A fila diária contém apenas `high_priority` e `possible_opportunity`, respeitando `maximumDailyRecommendations`. As demais categorias permanecem observáveis nos contadores, sem ocupar a interface.
- O cache fica em `users/{uid}/jobRecommendations/today`. Ele é derivado, editável apenas pelo próprio usuário e nunca concede autoridade para aprovar, criar ou enviar candidatura.
- `generateDailyJobRecommendations(candidateId)` exige que o ID seja o usuário autenticado, lê no máximo 200 candidatas publicáveis e usa o perfil legado como fallback quando as preferências do Apply estão ausentes ou inválidas. O cache diário é invalidado quando preferências ou histórico mudam; atualizações forçadas repetidas têm intervalo mínimo de cinco minutos.

## Ordem dos filtros

1. Vaga publicável e não expirada.
2. Duplicata por URL normalizada ou empresa+título+local.
3. Candidatura ou recusa já registrada.
4. Empresa bloqueada.
5. Requisito eliminatório incompatível.
6. Risco crítico.
7. Score mínimo.
8. Ordenação por categoria, score, data e ID estável.
9. Limite diário configurado pelo candidato.

Requisitos sem informação suficiente não eliminam silenciosamente a vaga: viram risco para revisão. Isso reduz falso negativo e deixa claro o que o candidato precisa conferir.

## Analytics

- `recommendation_generated`
- `recommendation_viewed`
- `recommendation_saved`
- `recommendation_rejected`
- `recommendation_package_started`

Os eventos carregam somente propriedades da allowlist de analytics; motivo de recusa é uma enumeração e não texto profissional livre.

## Limites desta etapa

- “Preparar” abre o fluxo de revisão existente. Geração do pacote completo pertence à etapa seguinte.
- Não há candidatura automática nem envio sem confirmação.
- A geração diária acontece ao abrir/atualizar a seção. Uma execução agendada no backend pode ser adicionada depois reutilizando o contrato do domínio, sem mudar a tela.
- O limite de 200 leituras reduz custo acidental, mas não é uma solução de escala nem garante cobertura do catálogo. Antes de crescer, a descoberta deve migrar para candidatos pré-computados/consultas indexadas no backend.
