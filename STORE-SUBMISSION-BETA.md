# Submissao do beta — Apple App Store e Google Play

Data da revisao das regras: 2026-08-03. Este arquivo separa o que o repositorio
ja garante do que precisa ser preenchido ou comprovado nos consoles. Fontes
oficiais: [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/),
[Apple App Privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/),
[Google App content](https://support.google.com/googleplay/android-developer/answer/9859455),
[Google Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)
e [Google account deletion](https://support.google.com/googleplay/android-developer/answer/13327111).

## URLs e textos preparados

- landing: `https://hirly.app/`;
- suporte: `https://hirly.app/suporte.html`;
- Termos: `https://hirly.app/termos.html`;
- Privacidade: `https://hirly.app/privacidade.html`;
- exclusao externa: `https://hirly.app/excluir-conta.html`;
- textos pt-BR: `store/metadata/pt-BR.json`.

As URLs so podem ser informadas nas lojas depois de publicadas em HTTPS e
testadas sem login. Termos e Privacidade continuam bloqueados ate a revisao
juridica e remocao de todos os marcadores.

## Declaracoes do produto

- login atual: e-mail e senha proprios; nao existe login social. Portanto, a
  regra de login equivalente da Apple nao exige Sign in with Apple nesta versao;
- anuncios: nao existem;
- compras, assinatura e conteudo pago: nao existem;
- localizacao do aparelho, camera, fotos, contatos e microfone: nao solicitados;
- curriculo: PDF opcional, maximo 10 MB, privado;
- IA do curriculo: somente depois de consentimento separado e versionado. O
  conteudo do PDF e enviado a Anthropic para extracao e o backend bloqueia o
  envio sem consentimento atual;
- candidaturas: o envio final ocorre fora da Hirly e depende de acao explicita
  do candidato. Nao alegar envio automatico;
- conteudo publico de usuario: nao existe. Feedbacks e denuncias sao privados e
  moderados, portanto nao formam uma rede social/UGC publico;
- exclusao: disponivel dentro do app e no portal web autenticado;
- criptografia: apenas a criptografia padrao de rede/plataforma; o app declara
  `ITSAppUsesNonExemptEncryption=false`;
- tracking publicitario entre empresas: nao existe. Autocapture, GeoIP e session
  replay ficam desativados.

Qualquer mudanca nesses fatos exige atualizar as declaracoes antes do novo build.

## Mapa preliminar Apple App Privacy

Preencher no App Store Connect conforme o build real. Esta tabela e conservadora;
nao reduzir declaracoes sem verificar SDKs e trafego de rede.

| Categoria Apple | Exemplos Hirly | Ligado ao usuario | Tracking | Finalidade |
|---|---|---:|---:|---|
| Name | nome do perfil | sim | nao | funcionalidade/personalizacao |
| Email Address | conta e recuperacao | sim | nao | funcionalidade |
| Phone Number | opcional no CV/perfil | sim | nao | funcionalidade |
| Coarse Location | cidade/UF informadas | sim | nao | personalizacao |
| Other User Content | PDF e dados profissionais | sim | nao | funcionalidade/personalizacao |
| User ID | UID Firebase/PostHog/Sentry | sim | nao | funcionalidade, analytics e seguranca |
| Product Interaction | visualizacoes, likes, funil | sim | nao | analytics/personalizacao |
| Crash Data | erros Sentry quando habilitado | pode ser | nao | funcionalidade/analytics |
| Performance Data | duracao e diagnosticos | pode ser | nao | funcionalidade/analytics |
| Other Data | preferencias profissionais e consentimentos | sim | nao | funcionalidade/personalizacao |

No formulario, declarar coleta mesmo quando o dado e opcional ou ocorre apenas
depois de consentimento. Revisar os manifests de privacidade dos SDKs no archive
final e responder ao relatório do App Store Connect, sem copiar esta tabela às cegas.

## Mapa preliminar Google Data safety

- dados coletados: informacoes pessoais, localizacao aproximada informada,
  arquivos/documentos, atividade no app, IDs e diagnosticos;
- finalidades: funcionalidade, personalizacao, analytics, seguranca e suporte;
- obrigatorio/optional: conta e preferencias essenciais sao obrigatorias;
  curriculo, telefone, formacao detalhada e analytics de terceiros dependem do
  uso/configuracao descritos no app;
- compartilhamento: declarar a Anthropic quando o usuario autoriza a analise do
  CV. Confirmar se Firebase, PostHog e Sentry se enquadram como prestadores de
  servico sob os termos do formulario e contratos reais;
- seguranca em transito: sim, TLS;
- exclusao: sim, app e URL publica;
- revisao de seguranca independente: nao marcar sem certificacao real.

## Apple — preenchimento e review

- [ ] Apple Developer ativo; se empresa, entidade e D-U-N-S verificados.
- [ ] App ID `com.hirly.app`, certificados e agreements ativos.
- [ ] Build criado com Xcode 26+ e SDK iOS/iPadOS 26+.
- [ ] Nome, subtitle, descricao, keywords, categorias, copyright e URLs.
- [ ] Screenshots reais nos tamanhos pedidos; nenhuma moldura/texto enganoso.
- [ ] App Privacy preenchido e coerente com SDKs, consentimento e politica.
- [ ] Privacy manifests/required-reason APIs validados no archive final.
- [ ] Age Rating respondido com o comportamento real.
- [ ] Export compliance confirmado com a declaracao do app.
- [ ] Conta de review ativa, senha, passos e dados ficticios uteis.
- [ ] Pelo menos tres vagas verificadas e links funcionando na conta de review.
- [ ] Review notes explicam CV opcional, consentimento da Anthropic, pacote
  deterministico, candidatura externa e exclusao.
- [ ] Nenhum placeholder, tela vazia, crash, link quebrado ou recurso oculto.
- [ ] Primeiro build externo aprovado no TestFlight antes de convidar externos.
- [ ] Beta description, feedback e “What to Test” preenchidos.

## Google Play — preenchimento e review

- [ ] Identidade e contatos da conta de desenvolvedor verificados.
- [ ] Package `com.hirly.app` registrado e Play App Signing configurado.
- [ ] AAB assinado confirma target Android 16/API 36.
- [ ] Main store listing, categoria, contato, URL de privacidade e screenshots.
- [ ] App access contem conta e passos de review sem OTP ou intervencao manual.
- [ ] Ads = nao; target audience definido; content rating concluido.
- [ ] Data safety preenchido e coerente com app, SDKs e politica.
- [ ] URL de exclusao cadastrada e fluxo web testado ponta a ponta.
- [ ] Closed testing no track `alpha`; release continua `draft` ate autorizacao.
- [ ] Se a conta pessoal foi criada depois de 13/11/2023: manter pelo menos 12
  testadores inscritos continuamente por 14 dias antes de pedir producao.
- [ ] Paises do beta definidos; recomendacao inicial: Brasil somente.
- [ ] Nenhuma permissao sensivel ou declaracao de suporte universal a ATS.

## Conta de review e “What to Test”

Criar fora do repositorio uma conta descartavel, sem dados pessoais reais. Nao
versionar a senha. Preparar nela:

- perfil e preferencias completos;
- um PDF ficticio explicitamente criado para review;
- tres ou mais vagas ativas, verificadas e com destino controlado;
- uma recomendacao pronta para preparar;
- um pacote sem pendencias e outro com pendencia sensivel;
- uma sessao externa que permita testar retorno sem enviar dados a empresa real.

Texto base para “What to Test”:

> Teste a selecao de vagas, prepare e revise um pacote, confirme que aprovar nao
> envia a candidatura, abra a assistencia externa e registre o resultado. Teste
> tambem o consentimento separado antes da analise do CV e a exclusao pelo Perfil.

## Decisoes que o codigo nao pode tomar

- idade minima e tratamento de menores;
- identidade do controlador, endereco, suporte e encarregado;
- bases legais, retencao, transferencias e contratos com operadores;
- titularidade/licenca de cada vaga, marca e logo;
- classificacao etaria e publico-alvo declarados;
- distribuicao por pais e tamanho do grupo beta.

Esses itens continuam bloqueadores ate decisao e evidencia externas.
