# Vitaey Rollback / Deploy Log

## 2026-05-21 - Frontend premium redesign

- Target: `www.vitaey.felpamusic.com.br`
- Branch: `main`
- Previous commit before this change: `02135dadaa77d5adce3c2d092662331aaaa26fa5`
- Previous production deployment id: `dpl_8iYMLzg85omoL852vG7Kd21oo4LK`
- Previous production deployment URL: `https://vitaey-fh767x3eb-felpas-projects.vercel.app`
- Production aliases observed before deploy:
  - `https://www.vitaey.felpamusic.com.br`
  - `https://vitaey.vercel.app`
  - `https://vitaey-felpas-projects.vercel.app`
- Previous status: `Ready`
- Rollback route: redeploy commit `02135dadaa77d5adce3c2d092662331aaaa26fa5` or use Vercel rollback to `dpl_8iYMLzg85omoL852vG7Kd21oo4LK`.

## Validation before deploy

- `pnpm --dir apps/web run build`
- `pnpm --dir apps/web run test:e2e`
- `pnpm --dir apps/web exec node C:\Users\feema\codex-agency\frontend-resources\scripts\contrast-audit.mjs http://127.0.0.1:5188`
