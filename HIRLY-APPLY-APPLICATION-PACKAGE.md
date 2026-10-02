# Hirly Apply — pacote automático de candidatura

## Pipeline

O pacote é gerado por etapas independentes em `functions/shared/applicationPackage.js`:

1. `collectCandidateFacts`: cria o inventário de fatos e fontes permitidas.
2. `analyzeJob`: separa requisitos obrigatórios e desejáveis.
3. `selectResume`: seleciona somente um currículo realmente existente.
4. `suggestResumeChanges`: sugere apenas ênfase ou reorganização de fatos existentes.
5. `generatePitch` e `generateCoverLetter`: usam claims vinculadas a IDs de fatos.
6. `generateAnswers`: responde somente quando existe evidência; caso contrário, cria uma pergunta.
7. `validateFacts`: rejeita fontes desconhecidas antes da persistência.
8. `consolidatePackage`: reúne resultados, falhas parciais, pendências, riscos e checklist.

Nenhuma etapa altera o perfil, currículo original, datas ou pretensão salarial.

A versão atual é um gerador determinístico baseado em templates e proveniência. Ela não chama um provedor de IA generativa. Isso mantém o fallback funcional, custo de IA igual a zero neste fluxo e comportamento reprodutível; a interface não deve atribuir esses textos à IA.

## Proveniência

Conteúdos, respostas, avaliações e itens do checklist possuem:

- fontes estruturadas;
- confiança;
- justificativa;
- indicação de necessidade de revisão.

Fontes aceitas: perfil, currículo, fato profissional aprovado, resposta anterior aprovada escrita ou editada pelo candidato, entrada explícita, descrição da vaga e regra do sistema. Uma resposta apenas gerada pelo sistema nunca é promovida a fato profissional, mesmo que tenha sido aprovada sem edição. Conteúdo editado pelo candidato passa a usar `user_input` e confiança alta.

## Estados

- `not_started`
- `generating`
- `needs_information`
- `ready_for_review`
- `approved`
- `failed`

Os estados são mapeados para os status operacionais legados, mantendo compatibilidade com documentos anteriores.

## Cache e regeneração

O backend calcula um fingerprint SHA-256 usando versão do gerador, vaga, currículo, perfil, fatos e respostas aprovadas. Um pacote válido é reutilizado enquanto o fingerprint não mudar.

O pacote também guarda um fingerprint separado do conteúdo da vaga. Título, empresa, descrição, requisitos, localização, remuneração, prazo ou URL alterados depois da aprovação exigem nova preparação e aprovação antes de abrir a candidatura externa.

Regeneração recebe uma seção explícita e preserva todas as outras. Uma falha não sobrescreve a revisão anterior.

## Autoridade e consentimento

- Metadados: `users/{uid}/applicationPackages/{jobId}`.
- Respostas: subcoleção `answers`.
- Fingerprint e auditoria: `applyOperations`.
- Memória aprovada: `approvedAnswers`.
- Somente Cloud Functions escrevem nesses documentos.
- O candidato lê apenas os próprios dados.
- Aprovar o pacote não cria nem envia candidatura.
- O envio externo continuará exigindo confirmação separada.

## Callables

- `prepareApplicationPackage`
- `regenerateApplicationPackageSection`
- `updateApplicationPackageContent`
- `approveApplicationPackage`
- `rejectApplicationPackage`
