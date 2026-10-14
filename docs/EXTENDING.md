# Extensão e manutenção do Thcode

## Linguagens com funções reais
JavaScript continua sendo o backend e frontend existentes. TypeScript acrescenta um cliente tipado e somente leitura de `/api/ready` em `packages/api-client/`. Python valida a configuração de deploy e testa os scripts em `scripts/`. Bash fornece um diagnóstico de readiness em `scripts/smoke_ready.sh`. SQL inspeciona eventos já persistidos, sem modificar dados, em `ops/sql/event_audit.sql`.

Esses arquivos não habilitam execução de toda linguagem no editor. O executor local existente suporta JavaScript, Python e shell, conforme `backend/src/run.js`; TypeScript precisa ser compilado e SQL precisa de um banco autorizado. A rota E2B existente aceita Python, JavaScript, TypeScript, R, Java e Bash, condicionados a credenciais, template compatível e validação remota. Isso não foi validado nesta mudança. Não foram adicionados Go, Rust, Java ou outros runtimes pesados à imagem de produção apenas para mudar o gráfico de linguagens.

## Verificação local e CI
Na raiz:
```sh
python3 scripts/check_deploy.py
python3 -m unittest discover -s scripts/tests -v
bash -n scripts/smoke_ready.sh
cd packages/api-client
npm ci
npm test
```
A validação Python não consulta Railway nem lê Secrets. Os testes do cliente usam respostas injetadas e os testes shell usam HTTP local; não validam contas de terceiros.

Para um diagnóstico real, somente leitura:
```sh
bash scripts/smoke_ready.sh https://SEU_BACKEND
```
HTTP 200 com `status=ready` comprova somente o contrato de readiness existente. Não comprova uso do E2B, GitHub ou provedores de IA. Não informe tokens na linha de comando ou nas mensagens. Configure credenciais exclusivamente em Secrets/Variables do Railway.

## Novas funções sem quebrar produção
Organize novas rotas em módulos de `backend/src/` e respectivos testes em `backend/tests/`. Clientes independentes ficam em `packages/`; manutenção fica em `scripts/`; consultas operacionais em `ops/sql/`. Documente dependências, autenticação, timeouts, limites e erros antes de habilitar integrações. Use branches e pull requests para revisar mudanças antes de disparar deploy de `main`.

A arquitetura permite crescer, mas não há promessa de funções, execuções, armazenamento ou integrações sem limite. Custos e cotas pertencem a cada provedor. Consulte também [deploy](DEPLOY.md), [infraestrutura](infrastructure.md) e [prioridades](PRIORITIES.md).
