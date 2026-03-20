# Página Feedbacks

## Descrição

Centraliza o registro e o acompanhamento de pendências operacionais do sistema na rota `/system/feedbacks`.

## Fluxo

- `GET /api/v1/system/feedbacks/task`: lista todas as pendências.
- `POST /api/v1/system/feedbacks/task`: cria uma nova pendência com status inicial `1` (pendente).
- `PUT /api/v1/system/feedbacks/task?admin=1`: atualiza status, parecer técnico e commit no modo admin sem autenticação.
- `PATCH /api/v1/system/feedbacks/task?admin=1`: edita `descricao`, `onde` e `quem` no modo admin sem autenticação.

## Campos principais (`feedback_tasks`)

- `id`
- `descricao` (obrigatório)
- `onde` (obrigatório)
- `quem` (opcional)
- `url_anexo` (opcional)
- `url_anexos` (opcional, múltiplos anexos)
- `status` (`1 = pendente`, `2 = processando`, `3 = concluído`)
- `git_commit` (opcional)
- `parecer` (obrigatório na atualização de status)

## Observações

- A listagem é pública para consulta e abertura de novas pendências.
- O modo admin é habilitado ao acessar `/system/feedbacks?admin=1`, sem exigir sessão administrativa.
- O botão `Copy` gera um prompt completo já orientado para o diretório raiz do projeto.
- Os feedbacks antigos de `/app/configuracao-empresa` são migrados para `feedback_tasks` pela migration `047_create_feedback_tasks.js`.
