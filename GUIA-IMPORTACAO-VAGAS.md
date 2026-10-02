# Guia de Importacao de Vagas - Hirly

Workflow passo-a-passo para coletar vagas (do WhatsApp ou de outras fontes) e importar pro Firestore.

---

## 1. Setup inicial (uma vez só)

### 1.1 Credencial administrativa

O importador usa Application Default Credentials. Nao salve JSON de conta de
servico dentro do repositorio. Use uma destas opcoes fora da pasta do projeto:

1. autenticacao local com `gcloud auth application-default login`; ou
2. `GOOGLE_APPLICATION_CREDENTIALS` apontando para um arquivo protegido fora do
   repositorio, quando uma chave for estritamente necessaria.

Confirme o projeto alvo antes de qualquer escrita. Credenciais administrativas
devem ter somente as permissoes necessarias e ser revogadas quando deixarem de
ser usadas.

### 1.2 Instalar dependência server-side

```bash
cd /caminho/para/Hirly
npm install --no-save firebase-admin
```

> O `--no-save` evita poluir o `package.json` do app — o `firebase-admin` é só pra scripts locais.

---

## 2. Workflow recorrente — toda semana

### Passo 1: Exportar a conversa do WhatsApp

**iPhone:**
- Abre o grupo no WhatsApp
- Toca no nome do grupo → role pra baixo → **Exportar Conversa**
- Escolhe **Sem Mídia**
- Salva o `_chat.txt` em qualquer lugar (Downloads, AirDrop pro Mac, etc.)

**Android:**
- Abre o grupo → menu (3 pontos) → **Mais** → **Exportar conversa** → **Sem mídia**

### Passo 2: Processar com a ferramenta aprovada

Use uma ferramenta aprovada pelo proprietario para transformar o arquivo em:
- `data/vagas-batch-N.json` — formato pro Firestore
- `data/vagas-batch-N.csv` — abre no Google Sheets pra revisar

### Passo 3: Revisar no Google Sheets (obrigatorio antes de publicar)

1. Abra o `.csv` no Google Sheets (File → Import → Upload)
2. Confira: **título, empresa, URL, área**
3. Corrija o que estiver estranho (nome de empresa errada, URL quebrada)
4. Apague linhas que não são vagas reais
5. Confirme `sourceUrl`, país, taxonomia, requisitos, data e se o link continua
   aceitando candidaturas. Não complete salário, benefício ou requisito por
   inferência.
6. Exporte de volta e execute a auditoria. A importação continuará em draft;
   a aprovação ocorre pelo processo administrativo.

### Passo 4: Dry-run (vê o que VAI fazer sem escrever)

```bash
node scripts/importVagas.js data/vagas-batch-1.json --dry-run
```

Vai listar todas as vagas que seriam inseridas. **Não escreve nada no Firestore.**

### Passo 5: Importar de verdade

```bash
node scripts/importVagas.js data/vagas-batch-1.json
```

Cada vaga vira um documento em `jobs/{id}` no Firestore, sempre como `draft`,
`unverified` e inativa. O ID é estável pela URL; reimportar conteúdo alterado
invalida a revisão anterior. As opções destrutivas `--replace` e `--force-live`
foram removidas e não devem ser recriadas.

---

## 3. Formato do JSON

Cada vaga no JSON tem esses campos. O script `importVagas.js` cuida da conversão pra Firestore:

```json
{
  "title": "Estágio em M&A",
  "company": "Vinci Partners",
  "applyUrl": "https://vincipartners.gupy.io/job/...",
  "type": "Híbrido",                    // Remoto | Híbrido | Presencial
  "contractType": "Estágio",            // Estágio | Trainee | CLT | PJ
  "city": "São Paulo",
  "state": "SP",
  "location": "São Paulo, SP",
  "salary": "R$ 2.500",
  "salaryMin": 2500,
  "salaryMax": 2500,
  "salaryDisclosed": true,
  "area": "Finanças & Contabilidade",
  "description": "Apoie o time de Investment Banking...",
  "requiredSkills": ["Excel avançado", "Inglês fluente"],
  "benefits": ["VR/VA", "Plano de saúde", "Gympass"],
  "affirmativeFor": [],                 // ["Racial", "PcD", "Mulheres", "LGBTQIA+"]
  "publishedAt": "2026-04-15T10:00:00",
  "lastVerifiedAt": "2026-04-15T10:00:00",
  "companyDomain": "vincipartners.com",
  "companyLogoUrl": "https://logo.clearbit.com/vincipartners.com",
  "gradientColors": ["#7C5CFF", "#06B6D4"],
  "source": "manual",
  "status": "draft",
  "isActive": false
}
```

---

## 4. Conferir o banco sem apagar

```bash
# DRY: vê quantas vagas existem
node -e "
const admin=require('firebase-admin');
admin.initializeApp({credential:admin.credential.applicationDefault()});
admin.firestore().collection('jobs').get().then(s => console.log(s.size + ' vagas no Firestore'));
"

# Auditoria local sem escrita
npm run jobs:audit
node scripts/importVagas.js data/vagas-batch-1.json --dry-run
```

---

## 5. Proximos passos sugeridos

- [x] Ignorar `scripts/service-account.json` e dados pessoais de importacao
- [x] Bloquear o feed para vagas sem revisão, verificação e curadoria aprovadas
- [x] Adicionar denúncia idempotente e pausa automática por múltiplos usuários
- [ ] Quando crescer: importação automática via Telegram bot ou Slack webhook
