# SECURITY

- Auth: Bearer THCODE_API_TOKEN (timing-safe). Sem token -> 401.
- Secrets: so no backend (.env). O navegador nunca recebe chaves do servidor.
  Tokens do modo direto ficam no Vault AES-256-GCM do dispositivo (WebCrypto PBKDF2).
- Path traversal: wsPath() prende todo caminho ao WORKSPACE_DIR (../../etc/passwd -> 400).
- Command injection: rotas usam execFile com array de args validados (sem shell).
  O terminal e shell real POR DESIGN (e um terminal), rodando como usuario do processo;
  em producao use o contêiner Docker fornecido.
- Rate limit por IP; body JSON limitado a 2 MB; leitura de arquivo >2 MB rejeitada.
- DELETE da raiz do workspace recusado. Erros propagam com status + motivo real.
