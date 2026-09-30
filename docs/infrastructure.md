# Infraestrutura Thcode v2.6

## Escopo e estado real
O backend Node 22 integra o SDK oficial `@e2b/code-interpreter`, PostgreSQL via `pg` e Redis via `redis`.
Os serviços são opcionais. Sem configuração, o status é `disabled`, nunca `ready`.
Quando configurados mas inacessíveis, o status é `disconnected`; `/api/ready` responde 503.
O readiness também exige `THCODE_API_TOKEN` configurado. Ele não declara GitHub, IA ou E2B remotamente validados.

Redis tem conexão/ping reais e healthcheck, mas não é usado como banco, fila ou sincronizador de arquivos. Não há implementação fictícia dessas funções.
Postgres persiste eventos E2B em `thcode_e2b_events`, com unicidade em `id`. Arquivos do workspace continuam em disco e exigem volume persistente.

## Segurança e configuração
Todos os endpoints de sandbox exigem o Bearer `THCODE_API_TOKEN` existente.
`E2B_API_KEY` e `E2B_WEBHOOK_SECRET` ficam exclusivamente no ambiente do backend.
O cliente não pode substituir API key, metadados ou template através do corpo/URL.
Sandboxes são identificados por metadados `application=thcode` e `workspace=E2B_WORKSPACE_ID`. Configure uma identidade exclusiva para cada workspace.
Código executa dentro do sandbox E2B. Timeout de execução: 1 a 60 segundos. Vida solicitada do sandbox: 1 a 300 segundos. Encerrar explicitamente quando terminar reduz uso faturável do provedor.
Esse backend usa autenticação de proprietário único. Não publique como serviço multiusuário sem isolamento e autenticação por usuário; o terminal e `/api/run` existentes executam localmente no container.

## API
`POST /api/e2b/sandbox`: `{ "timeoutMs": 60000 }`, retorna ID confirmado pelo SDK (201).
`GET /api/e2b/sandboxes`: primeira página, até 100 sandboxes do namespace; `hasMore` indica paginação pendente.
`GET /api/e2b/sandbox/:id`: informações reais, com verificação de propriedade.
`DELETE /api/e2b/sandbox/:id`: encerramento confirmado pelo SDK.
`POST /api/e2b/run`: `{ "sandboxId":"...", "language":"python", "code":"print(42)", "timeoutMs":30000 }`.
Resposta inclui duração, logs, resultados e erro do runtime. Nenhum exit code é inventado para execução via notebook/interpreter.
`GET /api/infrastructure`: autenticado, executa probes de DB e Redis.
`GET /api/ready`: público, retorna 200 ou 503 sem URLs/credenciais.
`POST /api/e2b/webhook`: externo, autentica exclusivamente pela assinatura, não pelo token do frontend.

## Webhook
Fonte oficial: https://docs.e2b.dev/sandbox/lifecycle-events-webhooks.md

A assinatura é `base64(sha256(secret + rawBody))` sem `=` final, no header `e2b-signature`.
A comparação usa `timingSafeEqual`. Não há aceitação de HMAC, hex, prefixos, Base64 URL-safe ou headers alternativos.
`e2b-signature-version`, quando enviado, deve ser `v1`.
O Express preserva o corpo bruto com limite 256 KiB antes do parser JSON global.
Eventos permitidos: `sandbox.lifecycle.created`, `killed`, `updated`, `paused`, `resumed`, `checkpointed`.
O `id` do evento é a chave de deduplicação, não `e2b-delivery-id` (que muda em cada tentativa).
Sem Postgres ou quando a persistência falha, responde 503. Não confirma recebimento durável sem gravar o evento.
Os eventos são armazenados, não disparam execução, exclusão ou mudanças de arquivos.

Registre no painel/API E2B um webhook HTTPS apontando para `https://SEU_BACKEND/api/e2b/webhook`, com o mesmo segredo do ambiente. A URL GitHub Pages não recebe POST de backend.
Registro oficial: `POST https://api.e2b.app/events/webhooks`, header `X-API-Key`, corpo com `name`, `url`, `enabled`, `events`, `signatureSecret`.
O commit do código não registra automaticamente o webhook nem cria infraestrutura na conta.

## Deploy e testes
Veja [DEPLOY.md](DEPLOY.md), `railway.json`, `backend/Dockerfile` e `backend/.env.example`.
Node 22 obrigatório. `npm ci && npm test` em `backend/`.
CI testa frontend, backend e construção Docker.

A suíte API executa filesystem, Git, Node e shell reais localmente. O teste de segurança verifica CORS, token, traversal e WebSocket de logs.
`infrastructure.test.mjs` usa clientes injetados: testes unitários de SDK, Postgres/Redis e protocolo HTTP. Esses testes não comprovam conexão com contas E2B/Railway nem entrega de webhook em produção.
O deploy de produção depende de credenciais válidas e precisa ser validado após configuração.

SIGTERM/SIGINT encerram sessões de terminal, WebSockets, HTTP e clientes de infraestrutura. Reconexão Redis após falha de conexão inicial exige reinício do backend nesta versão.
