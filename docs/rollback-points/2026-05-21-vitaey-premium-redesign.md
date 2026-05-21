# Rollback point - Vitaey premium redesign

Date: 2026-05-21
Branch: main
Previous commit: 8ce0845ce08ee9f53c6344b72987fae0293dad89

Previous production deployment:
- id: dpl_GYTtBNYXd3rbk8MxmZQcBCgw2se3
- status: Ready
- url: https://vitaey-eg502n14r-felpas-projects.vercel.app
- created: 2026-05-21 14:04:10 -03:00

Production aliases observed before this deploy:
- https://vitaey.vercel.app
- https://www.vitaey.felpamusic.com.br
- https://vitaey-felpas-projects.vercel.app
- https://vitaey-feemacedo123-2047-felpas-projects.vercel.app

Rollback route:
- Vercel dashboard: promote deployment `dpl_GYTtBNYXd3rbk8MxmZQcBCgw2se3`
- CLI: `npx vercel rollback https://vitaey-eg502n14r-felpas-projects.vercel.app --yes`

Validation before deploy:
- `pnpm --dir apps/web run build`
- `pnpm --dir apps/web run test:e2e`
- Desktop screenshot: `apps/web/output/screenshots/vitaey-desktop.png`
- Mobile screenshot: `apps/web/output/screenshots/vitaey-mobile.png`
