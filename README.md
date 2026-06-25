# Domani Mailer

> **Identidade visual:** paleta oficial Domani (laranja `#E56D23`, grafite `#1D1D1F`, preto, branco). Logo horizontal na sidebar, vertical no login, favicon com fundo branco. Trocar a logo = substituir os arquivos em `public/domani-*.png`.

Plataforma de disparo de e-mail **multi-cliente** da Domani. Cada cliente conecta
o SMTP dele (SendPulse, Gmail, Brevo…), com a marca dele — sobe planilha, monta
template, dispara e acompanha **aberturas e cliques** numa interface própria.

Roda inteiro no Vercel: Next.js (App Router) + Supabase (Postgres + Storage) + Nodemailer.

---

## Por que multi-cliente / BYO-SMTP

Cada cliente usa a conta SMTP dele. Consequências (todas boas pra uma agência):
- A reputação e o limite de envio são **da conta do cliente**, não da plataforma.
  Um cliente com lista ruim nunca derruba os outros.
- Não dependemos de provedor nenhum: o denominador comum é o SMTP. SendPulse é só
  o recomendado (free generoso); qualquer SMTP serve.
- O tracking (abertura/clique) é **nosso** (pixel + reescrita de link), então é
  consistente em todos os clientes, independente do SMTP.

## O que dá pra medir (honesto)

| Métrica   | Como                                   | Confiança |
| --------- | -------------------------------------- | --------- |
| Enviado   | resposta do SMTP + horário             | exato     |
| Aberto    | pixel 1×1 próprio                      | bom (imagens bloqueadas/Apple inflam) |
| Clicado   | link via redirecionador próprio        | exato (humano real) |
| Bounce    | rejeição síncrona do SMTP → suprime    | exato no síncrono |

"Entregue na inbox" e bounce assíncrono não existem via SMTP de terceiro — isso é
privilégio de quem É o servidor de e-mail. Bounce assíncrono (via IMAP) fica como
melhoria futura.

---

## Descadastro & conformidade

Todo e-mail sai com um link de descadastro no rodapé (injetado automaticamente
se o template não tiver) e com o header **List-Unsubscribe / one-click**, que o
Gmail e o Yahoo exigem para envio em massa. Ao descadastrar, o contato vira
`unsubscribed` e nunca mais entra em disparo — isso protege sua taxa de spam.

## Papéis, limites e agendamento

- **Papéis:** `admin` (gerencia clientes e usuários, além de operar) e `operator`
  (opera campanhas, contatos e templates; não cadastra clientes nem usuários).
  Trocado na tela **Usuários**. As ações sensíveis são barradas no servidor, não só na UI.
- **Limite por cliente:** cada cliente tem o teto diário dele (campo na tela Clientes).
  A fila respeita a cota de cada um — iFood nunca consome a cota do Mercado Pago.
- **Agendamento:** em *Nova campanha*, escolha data/hora em "Agendar para". A campanha
  fica `queued` e o cron a dispara sozinho no horário (ou use "Disparar agora").

## Arquitetura

```
  Cliente conecta SMTP (senha criptografada AES-256-GCM)
        │
  Campanha ──▶ enfileira 1 envio por contato em email_sends (pending)
        │
  Vercel Cron (1/min) ──▶ /api/cron/dispatch
        │   agrupa por cliente, usa o SMTP de cada um, injeta tracking
        ▼
  /api/track/open|click  ──▶ grava abertura/clique
```

---

## Setup

### 1. Banco (Supabase)
1. Crie o projeto e rode, no SQL Editor, em ordem:
   `0001_init.sql`, `0003_clients.sql` e `0004_roles_limits.sql`.
2. Em Storage, crie um bucket privado `imports`.
3. Pegue URL, anon key e service_role key em Settings → API.

### 2. Variáveis
```bash
cp .env.example .env
openssl rand -hex 32     # cole em ENCRYPTION_KEY
```

### 3. Rodar
```bash
npm install
npm run dev      # http://localhost:3000
```
Cliente sem SMTP cadastrado roda em **modo mock** (loga em vez de enviar).

### 3b. Criar o usuário operador (login)
O painel é protegido por **Supabase Auth**. Crie quem vai operar em
Supabase → Authentication → Users → **Add user** (e-mail + senha). Depois é só
entrar pela tela `/login`. Rotas públicas de propósito: `/unsubscribe`,
`/api/track`, `/api/unsubscribe` e `/api/cron`.

### 4. Cadastrar um cliente
Na tela **Clientes**, preencha a marca e o SMTP do cliente e use **Testar conexão**
antes de salvar. Ex. SendPulse: host `smtp.sendpulse.com`, porta `587`, secure off.

---

## Deploy no Vercel
1. Importe o repo, configure as envs (inclua `APP_URL` final, `ENCRYPTION_KEY`, `CRON_SECRET`).
2. O `vercel.json` registra o cron de 1/min (pede plano Pro p/ `maxDuration: 60`).

---

## Fluxo
1. **Clientes** → cadastra marca + conecta SMTP do cliente.
2. **Contatos** → escolhe o cliente, sobe `.csv`/`.xlsx`. Colunas viram variáveis.
3. **Templates** → HTML com `{{nome}}`, `{{empresa}}`, `{{assinatura}}`, colunas…
4. **Campanhas → Nova** → escolhe cliente, lista, mensagem. "Disparar agora".
5. **Relatório** → enviados, aberturas, cliques, bounces, com horário e auto-refresh.

---

## Estrutura

```
src/
├── app/
│   ├── page.tsx                 dashboard
│   ├── clients/ campaigns/ contacts/ templates/
│   └── api/
│       ├── clients/  (+ /[id], /test)
│       ├── campaigns/ (+ /[id] = detalhe e disparo)
│       ├── contacts/  GET ?listId=  ·  POST importa planilha
│       ├── lists/ · templates/ (+ /[id])
│       ├── cron/      worker da fila
│       └── track/[id] abertura (pixel) e clique (?to=)
├── components/   Sidebar · ClientPicker · ui
├── lib/
│   ├── env.ts · crypto.ts · client-api.ts · use-client.ts
│   ├── supabase/  client (anon) + server (service-role)
│   └── email/     transporter (por cliente) · render+tracking · send
├── services/     clients · contacts · campaigns · dispatch
└── types.ts
```

> As pastas `[id]` são exigência do roteador do Next (App Router): um segmento
> dinâmico de URL precisa de uma pasta `[id]/route.ts`. Não é possível remover
> sem trocar de framework.


## Próximos passos sugeridos
- Papéis/permissões por usuário (hoje todo operador logado vê todos os clientes).
- Bounce assíncrono via IMAP, se precisar de número de bounce mais completo.
- Agendamento de campanha (a coluna scheduled_at já existe no schema).
