# Proteção da branch `main` (repositório privado)

O Git não versiona configurações do GitHub — ative manualmente:

1. No repositório: **Settings → Branches → Add rule**.
2. Branch name pattern: `main`.
3. Marque:
   - ✅ Require a pull request before merging (1 approval)
   - ✅ Require status checks to pass → `check` (workflow CI)
   - ✅ Require conversation resolution before merging
   - ✅ Do not allow bypassing the above settings
4. **Create**. O CI (`node --check` + `tests/smoke.mjs`) roda a cada PR.
