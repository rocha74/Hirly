# Website Manual Setup

O site fica em `website/` e gera um build estatico em `website/dist/`. Nenhum
deploy, DNS, formulario externo ou conta de analytics foi configurado.

## Antes de publicar

- [ ] Revisar `website/src/siteConfig.ts`.
- [ ] Confirmar se `hirly://` e o destino correto do CTA e do QR para o beta.
- [ ] Preencher App Store e Google Play somente quando existirem URLs reais.
- [x] Criar a pagina publica `/suporte.html` e o portal autenticado
  `/excluir-conta.html`.
- [ ] Publicar e testar essas paginas em HTTPS; definir o canal humano oficial de
  suporte e privacidade.
- [ ] Substituir todos os marcadores `[PREENCHIMENTO MANUAL OBRIGATÓRIO]`.
- [ ] Obter aprovacao profissional dos Termos e da Politica de Privacidade.
- [ ] Confirmar a versao legal e a estrategia de reconsentimento no app.
- [ ] Configurar dominio, HTTPS, cache e headers de seguranca no provedor escolhido.
- [ ] Publicar AASA e `assetlinks.json` com identificadores reais nos dois hosts.
- [ ] Decidir se o site tera analytics. Caso tenha, conectar somente pelo adapter
  `website/src/analytics.ts` e manter dados pessoais fora dos eventos.
- [ ] Definir uma lista de espera real antes de exibir qualquer formulario.

## Validacao local

```bash
cd website
npm install
npm run typecheck
npm run build
npm run preview
```

## Paginas produzidas

- `/` - landing page;
- `/termos.html` - Termos em revisao;
- `/privacidade.html` - Politica de Privacidade em revisao.
- `/suporte.html` - ajuda de autosservico e links operacionais;
- `/excluir-conta.html` - exclusao autenticada fora do aplicativo.

O portal usa Firebase Auth e a callable `deleteMyAccount`. Antes de publicar,
confirme que os identificadores `VITE_FIREBASE_*` apontam para o mesmo projeto do
app, que o dominio esta autorizado no Firebase Auth e que a Function implantada
passa no teste com uma conta descartavel.

Defina também `VITE_APP_ENV`. Staging e produção não aceitam configuração
ausente nem o projeto `job-swipe-o678qx`, reservado ao desenvolvimento.

O QR atual aponta para o custom scheme `hirly://`. Ele funciona apenas para quem
ja possui um build compativel instalado.
