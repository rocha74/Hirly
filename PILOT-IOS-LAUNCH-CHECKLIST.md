# Checklist mestre — piloto iOS

Última revisão: 16/09/2026. Este documento separa código, teste local e validação real. Código e teste local não provam que o piloto está seguro em produção.

## Implementado

- Barreira `accountLifecycle`: conta em `deleting`, `retry_required` ou `deleted` não pode iniciar novas operações autenticadas nem gravar por regras do Firestore/Storage.
- Exclusão recuperável: desabilita e revoga a sessão, limpa árvore do usuário, `aiQuotas`, Storage, eventos, feedbacks e denúncias; mantém tombstone e agenda novas tentativas.
- Exclusão não afirma desfazer e-mail já transmitido. O produto deve informar que a solicitação é aceita e que a limpeza continua em segundo plano.
- Upload aceita apenas PDF de até 10 MB. O backend confirma tamanho, tipo, geração exata, CRC e estrutura do PDF em processo isolado; PDFs inválidos, protegidos ou com ações ativas são recusados.
- Novos uploads são imutáveis. Metadados de validação e snapshots de candidatura são somente do servidor.
- Snapshot para candidatura por e-mail exige hash, geração, retenção de 1–90 dias e resultado `clean` de um scanner real. Sem scanner configurado, a criação do snapshot falha fechada e o envio por e-mail permanece bloqueado.
- App Check continua desativado por padrão; a correção do commit `15684db` foi preservada no wrapper de callables.

## Testado localmente

- `npm run test:functions`: exclusão, barreira de conta, PDF estrutural, IA, Hirly Apply e fluxo externo.
- `npm run typecheck`, `npm run lint`, `npm test`, regras no emulador, build do site e verificações de loja: pendente da execução final desta fase.
- Auditoria de dependências: pendente da execução final desta fase.

## Validar em ambiente real antes de liberar o piloto

- Implantar em projeto de teste e validar, com duas contas: exclusão concorrente com upload, IA e candidatura; troca de conta; upload interrompido; tentativa de leitura/escrita cruzada.
- Validar a regra de Storage com sessão resumível aberta antes da exclusão. Só então definir `STORAGE_DELETION_FENCE_VERIFIED=true`. Até isso, a conta é bloqueada e limpa, mas o tombstone permanece em drenagem de Storage por no mínimo oito dias.
- Integrar antivírus/antimalware com SLA, política de retenção e tratamento de indisponibilidade. Não tratar MIME, extensão ou parser de PDF como antimalware.
- Configurar e testar App Check em ambiente de teste primeiro; medir rejeições legítimas e só então ativar produção.
- Testar em aparelho iOS físico: login, exclusão, upload PDF normal/protegido/corrompido, retomada após rede cair e tela de erro.

## Pendências de lançamento

- Não há provedor de e-mail em produção nem envio real. A automação por e-mail segue bloqueada por scanner e por revisão de rota/destinatário.
- Formalizar retenção e eliminação de snapshots, resposta a incidente, suporte de exclusão e textos legais com responsável jurídico.
- Confirmar domínio de envio, SPF, DKIM, DMARC, remetente e política de respostas antes de qualquer envio automático.
- Executar a revisão de dependências e corrigir somente vulnerabilidades relevantes e compatíveis.
- Concluir metadados, privacidade, conta de desenvolvedor, TestFlight e revisão de App Store descritos em `STORE-SUBMISSION-BETA.md`.

## Regra de liberação

O piloto não deve habilitar candidatura automática por e-mail enquanto houver qualquer pendência de scanner real, App Check validado em teste ou teste real da exclusão concorrente. O modo assistido pode continuar disponível sem prometer envio automático.
