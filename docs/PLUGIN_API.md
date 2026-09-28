# Thcode Plugin API

Plugins personalizados são arquivos `.js` com um cabeçalho manifesto:

```js
// ==ThcodePlugin==
// @name Meu Atalho
// @id custom-meu-atalho
// @version 1.0.0
// @description O que ele faz
// ==/ThcodePlugin==

Thcode.commands.register('atalho', async (args, stdin) => {
  Thcode.notify('Meu Atalho', 'Executado: ' + args);
  return 'saída do comando';
});

Thcode.on('fs:save', (path) => console.log('salvo:', path));
```

## Instalação

No app: **Plugins → ＋ Novo** (gera o modelo), **📄 Arquivo** (arquivo `.js`)
ou **🔗 URL** (link direto). Plugins ficam salvos no aparelho.

## Referência `Thcode`

| Membro | Descrição |
|---|---|
| `Thcode.version` | Versão do app (`"v2.0.0 (2000)"`) |
| `Thcode.notify(titulo, corpo)` | Cria uma notificação |
| `Thcode.commands.register(nome, fn)` | Registra comando de terminal; `fn(args, stdin)` pode ser async e retornar texto |
| `Thcode.on(evento, fn)` | Assina eventos: `fs:save` (path), `app:boot` |
| `Thcode.fs.read(path)` | Lê conteúdo de arquivo (string ou `undefined`) |
| `Thcode.fs.write(path, texto)` | Escreve arquivo (salva automaticamente) |
| `Thcode.fs.list()` | Lista todos os caminhos do workspace |
| `Thcode.settings.get(k, padrao)` / `.set(k, v)` | Configurações do plugin (persistentes) |

## Eventos

- `fs:save` — disparado após cada salvamento, recebe o caminho.
- `app:boot` — disparado ao fim do boot real.
