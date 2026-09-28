# Política de Segurança

## Relatando vulnerabilidades

Abra uma issue **privada** (Security Advisory) neste repositório. Não divulgue
publicamente antes da correção.

## Escopo

- Este app roda 100% no cliente; não há backend oficial.
- Chaves de API ficam somente no `localStorage` do aparelho.
- Dependência de rede: `api.github.com` (leitura pública) e `openrouter.ai`
  (somente com chave do usuário).
