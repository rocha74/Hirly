# Product Review - Julho de 2026

Revisao do produto e do codigo depois do remake visual e das 12 tarefas do beta.
Os itens abaixo sao recomendacoes, nao funcionalidades declaradas como prontas.

## Prioridade 0 - Antes de usuarios reais

1. Corrigir e reverificar o catalogo. Confianca na vaga vale mais que qualquer
   nova feature neste momento.
2. Concluir deploys, App Check, juridico, observabilidade, deep links e preview
   assinado conforme `BETA-FINAL-MANUAL-ACTIONS.md`.
3. Rodar o fluxo completo em aparelhos reais com rede instavel e duas contas,
   incluindo troca de usuario, CV, candidatura externa e exclusao.

## Prioridade 1 - Melhores proximas apostas

1. **Localizacao mais flexivel:** permitir cidade digitada/raio/regiao quando a
   lista atual nao cobrir o candidato, sem enfraquecer os IDs canonicos.
2. **Feedback de relevancia contextual:** usar pass, denuncia e feedback curto
   para entender motivos agregados, sem tratar uma visualizacao como rejeicao.
3. **Evidencias de competencias:** deixar o candidato ligar uma skill a curso,
   projeto ou experiencia. Isso melhora a confianca sem inflar o score.
4. **Tracker mais util:** nota curta ja existe no modelo, mas falta interface;
   datas de proximo passo e lembretes locais podem ajudar sem depender da empresa.
5. **Pagina web de compartilhamento:** o link `hirly.app/v/:id` precisa de fallback
   web claro para quem nao tem o app, com vaga encerrada tratada corretamente.
6. **Explicacoes do feed:** mostrar no detalhe por que a vaga apareceu e permitir
   corrigir uma preferencia em um toque.

## Prioridade 2 - Depois de validar retencao

1. Notificacoes opt-in de vagas realmente novas e relevantes, com frequencia
   controlada pelo candidato.
2. Busca e colecoes salvas por objetivo, local e modalidade.
3. Experimentos de onboarding e completude guiados por funil real, nao por
   contagens ou promessas estaticas.
4. EAS Update apenas com politica de runtime, canais e rollback testado.

## Evitar agora

- Chat multiagente, entrevista longa e geracoes ilimitadas antes de comprovar
  valor, custo e seguranca das quatro features de IA atuais.
- Score mais detalhado ou casas decimais; a confianca dos dados importa mais que
  aparencia de precisao.
- Gamificacao que incentive adicionar skills nao comprovadas ou candidaturas em
  massa.
- Novas redes sociais ou comunidade antes de moderacao, suporte e privacidade.

## Divida tecnica recomendada

- Tornar adapters Firebase injetaveis para testar telas e providers sem rede.
- Dividir `FeedScreen` e `JobDetailScreen` em controladores/hooks menores depois
  do beta, preservando comportamento e design.
- Decidir o destino dos modulos antigos de agentes/pitch/entrevista que hoje nao
  possuem rota e ficam fora do bundle.
- Planejar New Architecture e upgrades de dependencias em uma branch dedicada.
