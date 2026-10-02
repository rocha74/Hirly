# Security Manual Actions

Este documento registra acoes externas que nao foram executadas localmente.
Nenhum valor de credencial e reproduzido aqui.

## Achados desta auditoria

- Existia uma chave privada de provedor de IA em `.env.local`, configurada com
  prefixo `EXPO_PUBLIC_`. O arquivo foi removido e o modo direto foi eliminado.
- Existia `scripts/service-account.json` com uma conta de servico Google/Firebase
  e chave privada. O arquivo foi removido.
- Nenhum dos dois caminhos aparece no unico commit existente. A varredura de
  padroes no historico tambem nao encontrou segredo no commit atual.
- Arquivos locais de importacao de vagas permanecem em `data/`, fora do Git por
  regra explicita. Eles devem ser revisados e removidos quando nao forem mais
  necessarios, principalmente se passarem a conter contatos ou candidaturas.
- O `firebaseConfig` do Web SDK permanece no cliente. Seus identificadores,
  inclusive `apiKey`, identificam o projeto e nao substituem regras, Auth ou App
  Check; nao sao credenciais administrativas.

## Revogar e recriar

### Chave do provedor de IA

1. Revogar a chave antiga no console do provedor, na area de API keys do
   workspace/projeto correspondente.
2. Criar uma chave nova com o menor escopo e limite de gasto possiveis.
3. Configurar a nova exclusivamente no Firebase Secret Manager com
   `firebase functions:secrets:set ANTHROPIC_API_KEY` e implantar novamente a
   Function quando autorizado.
4. Nao configurar a chave em `.env*`, `EXPO_PUBLIC_*`, EAS `extra`, `app.json`
   ou qualquer arquivo do app.
5. Verificar a revogacao fazendo uma requisicao controlada com a chave antiga
   fora do app: ela deve ser recusada. Depois, apagar com seguranca qualquer
   copia local usada no teste e confirmar que a Function funciona com a nova.

### Conta de servico Google/Firebase

1. No Google Cloud Console, abrir IAM e administrador > Contas de servico >
   conta correspondente > Chaves.
2. Desativar ou excluir a chave privada representada pelo JSON removido. Se a
   conta foi criada apenas para importacao local, considerar desativar a conta.
3. Se o importador ainda for necessario, criar uma nova chave somente depois de
   revisar as permissoes da conta e aplicar privilegio minimo.
4. Guardar a nova credencial fora do repositorio e apontar para ela por caminho
   local ignorado ou `GOOGLE_APPLICATION_CREDENTIALS`; preferir identidade sem
   chave em CI quando houver suporte.
5. Verificar a revogacao executando uma operacao somente de leitura com a chave
   antiga: a autenticacao deve falhar. Confirmar nos logs de auditoria que ela
   nao volta a ser usada.

## Verificacoes no Firebase

- Confirmar que `firestore.rules` publicado corresponde ao arquivo local.
- Confirmar que `storage.rules` publicado corresponde ao arquivo local testado.
- Ativar App Check para apps suportados e, antes de impor bloqueio, validar os
  tokens em ambiente beta.
- Revisar dominios autorizados do Authentication e remover entradas obsoletas.
- Confirmar alertas de orcamento, limites da Function e logs sem dados pessoais.
- Garantir Java 21 no ambiente de CI e executar `npm run test:rules:emulator`.

## Deploy manual da Tarefa 2

Antes do deploy, executar:

```bash
npm ci
npm ci --prefix functions
npm run test:functions
npm run test:rules:emulator
```

Depois de conferir o projeto selecionado em `.firebaserc`, implantar as regras e
a callable separadamente:

```bash
firebase deploy --only firestore:rules,storage
firebase deploy --only functions:deleteMyAccount
```

Nenhum desses comandos de deploy foi executado nesta tarefa. Apos o deploy,
validar com duas contas de teste que uma nao le o curriculo da outra e executar
uma exclusao completa em dados descartaveis.

## Limpeza de historico, se um segredo for encontrado depois

1. Revogar primeiro; limpar Git nao torna uma credencial novamente segura.
2. Fazer backup controlado e coordenar uma janela com todos os colaboradores.
3. Usar `git filter-repo` para remover o caminho ou substituir o valor em todos
   os refs, revisando branches e tags. Nao executar essa reescrita sem aprovacao.
4. Fazer force-push coordenado, invalidar clones antigos e pedir novo clone.
5. Rodar `node scripts/secrets-check.js --history` no repositorio reescrito e
   confirmar no provedor que a credencial antiga continua revogada.
