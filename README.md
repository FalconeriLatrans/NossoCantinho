# Nosso Cantinho

Uma agenda para o casal guardar **memórias**, planejar **desejos**, trocar **feedbacks** e ver tudo num **calendário**.

- **Memórias:** várias fotos com capa, opção de repetir todo ano no calendário, vínculo com o desejo que a originou.
- **Desejos:** status *Desejamos → Planejado → Realizado*. "Planejado" exige data, horário e local e aparece em **Próximos encontros**. Ao marcar como realizado, o app oferece criar uma memória já vinculada.
- **Feedbacks:** um texto de cada parceiro, com vínculos N:N a memórias e desejos.
- **Calendário:** memórias, aniversários anuais, desejos planejados e feedbacks.

Cada seção tem sua cor: **memórias** em rosa, **desejos** em verde-sálvia e **feedbacks** em azul, todas em tons pastel (`src/styles/themes.css`).

Uma memória só pode ser vinculada a um desejo **realizado**. Enquanto houver memória vinculada, o desejo continua como "Realizado".

Stack: React 18 + TypeScript + Vite + Supabase (login, banco Postgres e fotos no Storage).

**Dois modos de funcionamento**, escolhidos automaticamente:

| Variáveis `VITE_SUPABASE_*` | Modo | Onde ficam os dados |
|---|---|---|
| preenchidas | **Supabase** (login obrigatório) | No Supabase, compartilhados entre os dois |
| vazias | **Local** (sem login) | Só no navegador daquele aparelho |

---

## Conectando ao Supabase (passo a passo)

### 1. Banco de dados
No Supabase, abra **SQL Editor → New query**, cole o arquivo certo e clique em **Run**:

- **Já rodou o `schema.sql` antigo?** Rode `supabase/migrations/001_atualizar_schema_antigo.sql`. Ele não apaga nada e pode ser rodado mais de uma vez.
- **Projeto novo, vazio?** Rode `supabase/schema.sql`.

### 2. Usuários
Em **Authentication → Users → Add user → Create new user**, crie um usuário para cada pessoa (e-mail + senha) e marque **Auto Confirm User**. Se já criou sem confirmar, abra o usuário e confirme o e-mail.

### 3. Variáveis de ambiente
Em **Project Settings → API** (ou **Data API**) do Supabase, copie a **Project URL** e a chave **anon / public** (*publishable*).

- **Localmente:** crie `.env.local` a partir de `.env.example`.
- **Na Vercel:** **Settings → Environment Variables**, cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` e depois faça um **Redeploy**. As variáveis entram no build, então sem um deploy novo elas não têm efeito.

> Nunca use a chave `service_role` no app: ela ignora todas as regras de segurança.

### 4. Primeiro acesso
1. A primeira pessoa entra com e-mail e senha e clica em **Criar cantinho**. Um código de convite aparece no topo da página.
2. A segunda pessoa entra com o próprio e-mail e senha, escolhe **Recebi um código** e digita o código.
3. Se havia algo cadastrado antes no navegador, aparece **"Encontramos registros salvos só neste aparelho"**. Clique em **Enviar** para levar tudo, com fotos, para o Supabase.

A partir daí, o que um salva o outro vê. O app busca as novidades ao voltar para a aba ou desbloquear o celular, e também pelo botão **Sincronizar** no menu da conta (canto superior direito).

### Problemas comuns
| Mensagem | O que fazer |
|---|---|
| "O banco do Supabase ainda não foi atualizado…" | Rode a migração do passo 1 |
| "E-mail ou senha incorretos." | Confira o usuário em Authentication → Users |
| "Este e-mail ainda não foi confirmado." | Confirme o usuário no painel (passo 2) |
| "Sem permissão para essa ação…" | O usuário ainda não criou nem entrou no cantinho |
| O app não pede login | As variáveis não chegaram ao build: confira os nomes e faça o Redeploy |

---

## Rodando localmente

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # checa tipos (tsc) e gera /dist
npm run preview    # serve o build de produção
```

Requer Node.js 18 ou mais recente.

## Publicando na Vercel

Importe o repositório na Vercel. Ela detecta o Vite sozinha: Build `npm run build`, Output `dist`. Depois cadastre as variáveis (passo 3 acima).

---

## Estrutura do projeto

```
src/
├── main.tsx                 # ponto de entrada
├── app/
│   ├── Root.tsx             # escolhe o modo (Supabase ou local)
│   ├── AuthGate.tsx         # login → criar/entrar no casal → app
│   ├── App.tsx              # layout, abas, busca, modais
│   ├── Banners.tsx          # avisos de convite e de importação
│   ├── DetailModal.tsx      # detalhe (editar / excluir)
│   ├── EditorModal.tsx      # criação / edição
│   └── navigation.ts        # contexto de navegação
├── components/
│   ├── layout/              # Header, Hero, TabNav, CenteredScreen
│   └── ui/                  # Modal, PhotoImage, SearchBar, EmptyState…
├── features/
│   ├── auth/                # Login, criar/entrar no casal, conta
│   ├── memories/            # página, card, formulário, detalhe, fotos
│   ├── wishes/              # página, próximos encontros, formulário, detalhe
│   ├── feedbacks/           # página, card, formulário, detalhe
│   └── calendar/            # página e regras do calendário
├── context/
│   ├── CantinhoContext.tsx  # dados + ações (salvar, excluir, sincronizar)
│   ├── cantinhoReducer.ts   # regras puras (inclui limpeza de vínculos)
│   ├── SessionContext.tsx   # usuário logado e casal
│   ├── ToastContext.tsx · ConfirmContext.tsx
├── services/
│   ├── repositories/        # contrato único + implementações
│   │   ├── types.ts         #   interface CantinhoRepository
│   │   ├── supabaseRepository.ts  # Postgres + Storage
│   │   └── localRepository.ts     # localStorage + IndexedDB
│   ├── supabase/            # login, casal, tradução de erros
│   └── local/               # localStorage (com migração) e fotos no IndexedDB
├── hooks/ · utils/ · constants/ · types/ · styles/
└── lib/supabase.ts          # cliente Supabase
supabase/
├── schema.sql               # instalação do zero
└── migrations/001_atualizar_schema_antigo.sql
```

**Personalização rápida:** nomes do casal e categorias ficam em `src/constants/index.ts`; cores e fontes em `src/styles/tokens.css`.

### Como os dados vão para o Supabase
| No app | No banco |
|---|---|
| Desejo | `experiences` (`planned_at` gravado em UTC e exibido no fuso do aparelho) |
| Memória | `memories` + `memory_photos` |
| Foto | arquivo em `memory-photos/<couple_id>/<memory_id>/<foto>.webp` (bucket privado, URLs assinadas válidas por 1 h) |
| Feedback | `feedbacks` + `feedback_memories` + `feedback_experiences` |

As fotos são redimensionadas (máx. 1600 px) e comprimidas antes do envio: uma foto de celular de ~5 MB fica com ~300 KB.

---

## O que foi corrigido em relação à versão anterior


### Impediam o deploy
- **O build falhava** (`tsc -b` com `noUnusedLocals`): imports sem uso (`useMemo`, `Star`, `ExternalLink`, `Link2`) e a função `remove()`, que nunca era chamada.
- **Faltava `src/vite-env.d.ts`**, então `import.meta.env` em `lib/supabase.ts` não compilava.

### Bugs funcionais
- **Fotos sumiam ao recarregar a página:** eram salvas como `blob:` URLs temporárias. Agora ficam no IndexedDB.
- **"Realizado → criar memória" abria um formulário em branco**, sem título e **sem o vínculo** com o desejo. Agora vem preenchido e vinculado.
- **Data errada à noite:** `toISOString()` usa UTC, então depois das 21h (horário de Brasília) "hoje" virava amanhã. Agora as datas usam o fuso local.
- **Aniversários anuais apareciam também em anos anteriores à memória.** Agora aparecem só a partir do ano original. Datas de 29/02 aparecem em 28/02 nos anos não bissextos.
- **Excluir deixava vínculos órfãos:** feedbacks continuavam apontando para memórias e desejos apagados. Agora os vínculos são limpos.
- **Editar um desejo apagava a data e o local** quando o status era "Realizado".
- **O link de origem** dos desejos era salvo mas nunca exibido. Agora aparece, com proteção contra links `javascript:`.
- **O campo "capa" estava duplicado no formulário** (radio + hidden com o mesmo `name`). Funcionava por acaso, pela ordem dos campos.
- **Fotos novas não podiam ser pré-visualizadas, removidas nem escolhidas como capa** antes de salvar.
- **O contador dos vínculos do feedback** ("N vinculada(s)") não atualizava ao marcar.
- **Era possível salvar um feedback vazio**, o que o banco rejeitaria.
- **Toasts sumiam antes da hora** ao aparecerem em sequência (o timer anterior não era cancelado).
- **`crypto.randomUUID` quebrava** ao testar pelo celular via IP da rede local (exige HTTPS). Agora há um fallback.
- **Fonte Prata** era usada no CSS mas nunca carregada.
- **Faltavam `key`s em listas do React** (avisos no console).
- **Um `<details>` dentro de `<label>`** no formulário de memória causava cliques estranhos.

### Melhorias
- Código dividido por funcionalidade, com componentes, estilos e regras separados.
- Confirmação ao fechar um formulário com alterações não salvas.
- Diálogo de confirmação no visual do app, no lugar do `window.confirm`.
- Acessibilidade: cards navegáveis por teclado, Esc fecha modais, `aria-*` nos diálogos e no toast, foco visível.
- A aba fica na URL (`#desejos`, `#calendario`…) e sobrevive ao F5 e ao botão Voltar.
- Busca ignora acentos ("cafe" encontra "café").
- Filtro por status nos desejos; estados vazios amigáveis; destaque do dia atual no calendário.
- Encontros planejados que já passaram mostram "já passou, foi realizado?".
- No celular: modais abrem como folha inferior e os campos não disparam o zoom automático do iOS.

### `supabase/schema.sql`
- Reescrito de forma legível.
- **Não havia como criar ou entrar num casal** pelo app (sem políticas de INSERT). Foram adicionadas as funções `create_couple()` e `join_couple(código)`, com limite de 2 membros.
- **Qualquer usuário logado podia enviar arquivos** para qualquer pasta do bucket. Agora o upload só é aceito em `<couple_id>/…` de um casal do qual o usuário faz parte.
- Foto e memória são obrigatoriamente do mesmo casal (FK composta).
- Triggers de `updated_at`, índices por `couple_id` e checagem de título não vazio.
- Testado em PostgreSQL 16 com RLS: um usuário de fora não vê nem altera nada do casal.

---
