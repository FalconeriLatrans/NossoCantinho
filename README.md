# Nosso Cantinho · versão de planejamento v2

Starter atualizado · ajustes de interface v3. Inclui:
- Abas Memórias, Desejos, Calendário e Feedbacks.
- Memórias com recorrência anual e múltiplas fotos; seleção de capa entre as fotos já salvas.
- Desejos com estados Desejamos, Planejado e Realizado. Planejado exige data/hora e local.
- Seção de próximos encontros para desejos planejados ainda não realizados.
- Ao marcar um desejo como realizado, o app oferece criar uma memória vinculada.
- Feedbacks com data como título, dois campos independentes (Roberto e Tamiris) e vínculos N:N com memórias e desejos.
- Navegação cruzada entre registros relacionados.

## Executar
1. Extraia o ZIP.
2. Na pasta do projeto, execute `npm install`.
3. Execute `npm run dev`.

## Estado desta entrega
A interface está em **modo demonstração local**, usando localStorage. Não conecte ainda dados pessoais nem considere a integração Supabase pronta. O schema SQL em `supabase/schema.sql` é a proposta relacional consolidada, mas ainda requer revisão e implementação dos fluxos de autenticação, criação/convite do casal, `couple_id` em todas as operações, upload seguro e URLs assinadas para fotos. O upload de fotos desta demonstração usa URLs temporárias do navegador; recarregar a página pode invalidá-las. A edição acrescenta novas fotos e permite escolher capa entre as fotos existentes, mas a remoção individual de fotos ainda não foi implementada.

## Modelo de dados
- `memories`: memórias e flag `is_anniversary`.
- `memory_photos`: fotos múltiplas e uma capa por memória.
- `experiences`: lista de desejos, agendamento e local.
- `feedbacks`: autor, data do feedback e texto.
- `feedback_memories` e `feedback_experiences`: relações N:N.
- `memories.experience_id`: memória opcional originada de um desejo.

O SQL inclui RLS e bucket privado como ponto de partida. Revise as políticas e os fluxos de associação do casal antes de executar em produção.

## Ajustes v3
- Identificação dos participantes como Roberto e Tamiris.
- Tipografia Prata nos títulos.
- Associações feitas por listas recolhíveis (dropdowns); detalhes exibem somente os vínculos existentes.
- Remoção de fotografias já adicionadas e seleção da capa entre as restantes.
- Altura da capa limitada para evitar imagens verticais cobrirem o cartão.
- Sombras suaves em cartões e modais.
- Feedbacks com dois campos de texto e data como título.
- Calendário movido para a última posição do menu.
