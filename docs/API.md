# API REST (backend)

Auth: `Authorization: Bearer <THCODE_API_TOKEN>`

GET  /api/health                    (sem auth) status real de tudo
FS   GET/POST/PUT/DELETE /api/fs/file, GET /api/fs/list, GET /api/fs/stat,
     POST/DELETE /api/fs/folder, POST /api/fs/move, POST /api/fs/copy
Run  POST /api/run {path,args}      -> exitCode, durationMs, stdout, stderr
Git  POST /api/git/init|add|commit|clone|pull|push|checkout|merge
     GET  /api/git/status|log|diff|branches
GH   GET /api/github/me|repos|repo/:o/:n(/branches|commits|issues|pulls|releases)
     POST /api/github/repo|fork|star|watch
SFTP POST /api/sftp/connect|disconnect|list|read|write|mkdir|rename|delete
AI   GET /api/ai/providers, POST /api/ai/chat {provider,messages,model?}
Misc GET /api/processes, GET /api/logs, POST /api/logs/clear
WS   /ws/terminal?token=  {in|resize} -> {out|err|exit}
     /ws/logs?token=      streaming em tempo real
