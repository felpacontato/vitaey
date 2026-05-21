# Rollback point - Vitaey Killian design system fix

Date: 2026-05-21

## Current production before deploy

- Branch: `main`
- Previous commit: `b9a1ceb16f6478f424e0a733701ef34d98bf98a9`
- Vercel project: `vitaey`
- Vercel project id: `prj_VzazR3VMG9wKWdDk468xRDgN7Njr`
- Previous production deployment id: `dpl_G7m2xcH7X7s6oKJMcS9o9pgKssaS`
- Previous production deployment URL: `https://vitaey-calm0765v-felpas-projects.vercel.app`
- Previous production status: `Ready`
- Production aliases:
  - `https://www.vitaey.felpamusic.com.br`
  - `https://vitaey.vercel.app`
  - `https://vitaey-felpas-projects.vercel.app`
  - `https://vitaey-feemacedo123-2047-felpas-projects.vercel.app`

## Rollback route

To restore this exact production state, redeploy or promote:

```powershell
$env:NODE_OPTIONS='--use-system-ca'
npx vercel rollback dpl_G7m2xcH7X7s6oKJMcS9o9pgKssaS
```

If rollback by deployment id is unavailable, checkout commit `b9a1ceb16f6478f424e0a733701ef34d98bf98a9`, run validation, then deploy production from the `vitaey` Vercel project.

## Deploy attempt notes

- Failed deployment: `dpl_3kpNgfLKQoPYf2VzsvmxxasBxfe4`
- Failed deployment URL: `https://vitaey-k91eg5n69-felpas-projects.vercel.app`
- Failure reason: Vercel used an incompatible pnpm version for `apps/web/pnpm-lock.yaml` lockfile v9.
- Production aliases remained on previous Ready deployment `dpl_G7m2xcH7X7s6oKJMcS9o9pgKssaS`.
