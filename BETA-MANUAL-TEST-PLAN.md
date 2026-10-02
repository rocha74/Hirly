# Beta Manual Test Plan

Executar em um iPhone e um Android fisicos usando o build `preview`, projeto
Firebase nao produtivo e duas contas descartaveis. Registrar versao, aparelho,
SO, conta, horario, resultado e evidencia para cada caso.

## Preparacao

1. Confirmar que Rules, indices e Functions testadas foram implantadas no projeto
   selecionado e que nenhuma credencial aparece no build.
2. Preparar vagas: ativa, expirada, pausada, inexistente, link quebrado e duas
   vagas relevantes para perfis diferentes.
3. Ativar paines de desenvolvimento do PostHog/Sentry e manter replay desativado.
4. Limpar dados dos dois usuarios e instalar o build do zero.

## Fluxo principal

1. Criar conta, verificar e-mail, abrir Termos e Privacidade separadamente e
   aceitar consentimento. Confirmar versoes/data no perfil.
2. Concluir objetivo, area e preferencias; voltar entre etapas e confirmar que
   selecoes permanecem. Chegar ao feed sem CV.
3. Fechar/reabrir o app durante cada etapa e confirmar retomada correta.
4. Atualizar o feed, carregar mais de um lote e testar erro/retry sem duplicacao.
5. Manter uma vaga visivel pelo tempo minimo; confirmar impressao somente depois.
6. Passar uma vaga, usar Undo, passar novamente e reiniciar o app. O estado deve
   acompanhar cada acao e sobreviver a logout/login.
7. Curtir e descurtir; conferir Curtidas e ausencia de repeticao no feed.
8. Abrir detalhe sem recarregar o catalogo, conferir match, confianca, motivos e
   dados ausentes em vaga completa e incompleta.

## Candidatura

1. Abrir um link valido; confirmar que ainda nao existe candidatura.
2. Voltar do navegador e testar `Ainda nao`, `Lembrar depois` e, por ultimo,
   `Sim, me candidatei`.
3. Confirmar deduplicacao, snapshot minimo e status manual no tracker.
4. Alterar entre applied, interviewing, rejected, offer e hired; reiniciar o app.
5. Testar URL invalida/quebrada, copia do link e denuncia. A vaga nao pode sumir
   nem virar candidatura.

## Curriculo e IA

1. Depois do consentimento, enviar PDF valido abaixo de 10 MB e revisar os dados
   extraidos. Confirmar que o perfil guarda metadata, nao URL permanente.
2. Tentar arquivo nao PDF, MIME incorreto, zero byte, acima de 10 MB e dois uploads
   concorrentes. As mensagens nao devem mencionar fornecedor, bucket ou HTTP.
3. Com duas contas, confirmar que uma nao le o CV da outra.
4. Exercitar cada feature beta, limite por minuto/dia, retry, offline, resposta
   invalida e App Check ausente. Confirmar eventos sem conteudo do CV/prompt.

## Links e ciclo de vida

1. Testar os tres formatos de link com app fechado, background e aberto.
2. Repetir deslogado e com onboarding incompleto; o destino deve ser retomado.
3. Testar vaga inexistente, inativa, expirada, host externo e ID invalido.
4. Excluir uma conta com CV, likes, pass, candidatura, feedback e evento de IA.
   Aguardar a Function, confirmar Auth removido e repetir a tentativa com seguranca.

## Observabilidade, acessibilidade e desempenho

1. Confirmar eventos obrigatorios, UID pseudonimo, reset no logout e ausencia de
   nome, e-mail, telefone, CV, prompts e respostas.
2. Disparar erro de teste e confirmar release, ambiente, tela e source map no Sentry.
3. Navegar com VoiceOver/TalkBack, fonte ampliada e reducao de movimento; conferir
   foco, rotulos, estado disabled/loading, contraste e alvo de toque.
4. Usar rede lenta/offline, lista longa e imagens ausentes; observar memoria,
   fluidez, renders, paginacao e listeners apos logout.

## Encerramento

- Executar exclusao das contas descartaveis e verificar dados residuais.
- Exportar evidencias dos dashboards sem PII.
- Registrar cada falha em `docs/BETA-KNOWN-ISSUES.md`; qualquer perda de dados,
  acesso cruzado, segredo, crash no fluxo principal ou vaga invalida e bloqueador.
