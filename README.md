# Nosso Cantinho

Uma agenda para o casal guardar **memórias**, planejar **desejos**, trocar **feedbacks** e ver tudo num **calendário**.

- **Memórias:** várias fotos com capa, opção de repetir todo ano no calendário, vínculo com o desejo que a originou.
- **Desejos:** status *Desejamos → Planejado → Realizado*. "Planejado" exige data, horário e local e aparece em **Próximos encontros**. Ao marcar como realizado, o app oferece criar uma memória já vinculada.
- **Feedbacks:** um texto de cada parceiro, com vínculos N:N a memórias e desejos.
- **Calendário:** memórias, aniversários anuais e desejos planejados.

Stack: React 18 + TypeScript + Vite. Sem backend por enquanto: os dados ficam no navegador (veja [Armazenamento](#armazenamento)).

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

1. Suba o projeto para um repositório no GitHub.
2. Na Vercel: **Add New → Project**, importe o repositório.
3. A Vercel detecta o Vite sozinha. Confira:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Deploy.**

Não é necessário configurar variáveis de ambiente enquanto o app estiver em modo local.

> ⚠️ **Importante:** no modo atual, cada navegador/aparelho tem os próprios dados. Se o Roberto abrir no celular dele e a Tamiris no dela, cada um verá registros diferentes. Para compartilhar os dados entre os dois é preciso concluir a integração com o Supabase (ver [Próximos passos](#próximos-passos)).

---

## Estrutura do projeto

```
src/
├── main.tsx                 # ponto de entrada: providers + <App />
├── app/                     # "casca" da aplicação
│   ├── App.tsx              # layout, abas, busca, modais
│   ├── DetailModal.tsx      # modal de detalhe (editar / excluir)
│   ├── EditorModal.tsx      # modal de criação/edição
│   └── navigation.ts        # contexto de navegação (abrir detalhe/editor)
├── components/
│   ├── layout/              # Header, Hero, TabNav
│   └── ui/                  # Modal, PhotoImage, SearchBar, EmptyState…
├── features/                # uma pasta por funcionalidade
│   ├── memories/            # página, card, formulário, detalhe, fotos, CSS
│   ├── wishes/              # página, próximos encontros, formulário, detalhe, CSS
│   ├── feedbacks/           # página, card, formulário, detalhe, CSS
│   └── calendar/            # página, regras do calendário, CSS
├── context/                 # estado global
│   ├── CantinhoContext.tsx  # dados + ações (salvar, excluir…)
│   ├── cantinhoReducer.ts   # regras puras (inclui limpeza de vínculos)
│   ├── ToastContext.tsx     # mensagens rápidas
│   └── ConfirmContext.tsx   # diálogo de confirmação
├── services/
│   ├── localRepository.ts   # localStorage + migração de dados antigos
│   └── photoStore.ts        # fotos no IndexedDB
├── hooks/                   # usePhotoUrl, useHashTab, useDirtyTracker…
├── utils/                   # datas, ids, texto, compressão de imagem
├── constants/               # nomes do casal, categorias, rótulos, chaves
├── types/                   # tipos de domínio
├── lib/supabase.ts          # cliente Supabase (ainda não utilizado)
└── styles/                  # tokens (cores/fontes), base, layout, componentes
supabase/schema.sql          # schema do banco (Postgres/Supabase)
```

**Personalização rápida:** nomes do casal e categorias de desejo ficam em `src/constants/index.ts`; cores e fontes em `src/styles/tokens.css`.

## Armazenamento

| O quê | Onde | Por quê |
|---|---|---|
| Memórias, desejos, feedbacks | `localStorage` | Simples e síncrono para dados de texto |
| Fotos | `IndexedDB` | Aceita arquivos binários e tem cota muito maior que os ~5 MB do localStorage |

As fotos são redimensionadas (máx. 1600 px) e comprimidas antes de salvar: uma foto de celular de ~5 MB fica com ~300 KB.

Os dados da versão anterior (chaves `nc_memories_v3`, `nc_experiences_v3`, `nc_feedbacks_v1`) são migrados automaticamente no primeiro acesso.

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

## Próximos passos

Para os dois usarem o mesmo cantinho em aparelhos diferentes:

1. Criar um projeto no Supabase e rodar `supabase/schema.sql` no SQL Editor.
2. Preencher `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (`.env.local` localmente e em *Environment Variables* na Vercel).
3. Implementar login (ex.: link mágico por e-mail) e a tela de criar ou entrar no casal (`create_couple` / `join_couple`).
4. Criar um `services/supabaseRepository.ts` com as mesmas operações de `localRepository.ts` + `photoStore.ts`. O resto do app não precisa mudar.
5. Fotos: upload para `memory-photos/<couple_id>/<memory_id>/<uuid>.webp` e exibição com URLs assinadas (`createSignedUrl`).

Observação: no banco, `planned_at` é `timestamptz`. Ao integrar, converta o valor local do formulário (`2026-11-20T20:00`) com o fuso do navegador.
