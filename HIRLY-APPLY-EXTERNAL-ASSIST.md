# Hirly Apply — candidatura assistida externa

## Escopo da primeira versão

A primeira versão usa o navegador do sistema e um painel auxiliar persistente no app. Ela reduz copiar, procurar currículo e lembrar pendências, mas não injeta scripts no site externo e não promete compatibilidade universal.

O fluxo é:

1. O candidato aprova o `ApplicationPackage`.
2. Ao escolher continuar, o backend cria ou retoma uma `ExternalApplicationSession` vinculada à revisão aprovada.
3. A fila passa para `external_pending` e depois `external_in_progress` quando o link abre.
4. O navegador externo é aberto e a tela auxiliar permanece disponível ao retornar.
5. O candidato copia dados e respostas, abre o currículo e marca o checklist.
6. Ao retornar, a Hirly pergunta se houve envio.
7. Somente “Concluí e enviei” cria o registro em `applications` e move a fila para `submitted`.

## Adaptadores

`ExternalApplicationAdapter` isola a estratégia da interface. O registro atual contém apenas `GenericFormAdapter`, com modo `manual_assist` e `canAutofill: false`.

Futuras implementações podem adicionar `GreenhouseAdapter`, `LeverAdapter`, `WorkdayAdapter` e `GupyAdapter` sem espalhar regras de domínio pela tela. Cada adaptador continuará proibido de receber senhas, resolver CAPTCHA ou acionar o envio final.

## Dados preparados

O backend monta campos comuns apenas a partir de perfil, currículo ou fato profissional aprovado:

- nome e sobrenome;
- telefone e e-mail;
- cidade;
- LinkedIn, GitHub e portfólio;
- formação.

Campos extraídos do currículo sem confirmação alta aparecem com indicação para conferência. A sessão persiste somente o caminho privado do currículo aprovado; a URL transitória do Firebase Storage é criada no momento da abertura e nunca é persistida. Se o candidato trocar o currículo após a aprovação, o início da sessão é bloqueado até nova preparação e aprovação.

Respostas sensíveis não são oferecidas para cópia. O usuário deve preenchê-las diretamente no site externo.

## Persistência e estados

A sessão é identificada por `jobId:packageRevision`. Reabrir a mesma tentativa recupera campos concluídos, respostas copiadas, checklist e erros. Uma revisão diferente do pacote gera outra sessão.

Estados usados: `created`, `in_progress`, `awaiting_confirmation`, `completed`, `failed` e `abandoned`.

Motivos de falha: `broken_link`, `expired_job`, `login_required`, `unexpected_question`, `site_error`, `missing_document`, `abandoned` e `other`.

## Segurança

- O backend exige pacote aprovado e revisão inalterada.
- A URL aceita somente HTTPS, sem credenciais embutidas.
- A publicação, o destino externo e o currículo aprovado são revalidados antes de abrir o navegador.
- A sessão fica em `users/{uid}/externalApplicationSessions` e é legível somente pelo proprietário.
- Todas as mutações são feitas por Cloud Functions usando o UID autenticado.
- Senhas externas e CAPTCHA ficam totalmente fora do sistema.
- Nenhuma candidatura é registrada sem confirmação explícita do candidato.

## Analytics

- `external_session_started`
- `external_answer_copied`
- `external_resume_opened`
- `external_application_confirmed`
- `external_application_failed`
- `external_failure_reason`

Os eventos carregam somente identificadores técnicos, estado e motivo enumerado; dados pessoais, respostas e URLs não são enviados.
