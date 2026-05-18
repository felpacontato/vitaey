# AgenteProjeto_Vitaey

## Projeto

Nome: Vitaey

Objetivo: criar um assistente de busca de emprego com IA que recomenda vagas, adapta curriculos/cartas, organiza candidaturas e reduz trabalho manual sem violar termos de plataformas.

Usuarios: profissionais brasileiros em busca de emprego, com foco inicial em pessoas que precisam organizar muitas vagas, melhorar aderencia ATS e acompanhar candidaturas.

Stack conhecido: React + Vite no frontend; Python + FastAPI no backend; PostgreSQL e Redis/Celery planejados; embeddings/LLM via adapters.

## Heranca global

Este agente herda:
- `C:\Users\feema\AGENTS.md`
- `C:\Users\feema\codex-agency\AGENTE.md`
- `C:\Users\feema\codex-agency\OPERACAO.md`
- `C:\Users\feema\codex-agency\GOVERNANCA.md`

## Escopo atual

- Dentro: base fullstack local, documentacao, contratos de API, UX inicial, guardrails de compliance e arquitetura modular.
- Fora: scraping massivo, auto-apply sem acao do usuario, deploy publico, uso de credenciais reais, integracoes pagas obrigatorias.
- Riscos: termos de uso de plataformas, privacidade de dados sensiveis de curriculo, vies de recomendacao, dependencia futura de APIs oficiais.
- Origem de deploy: ainda nao definida.

## Requisitos

- Funcionais:
  - Upload/parsing de curriculo por contrato de API.
  - Perfil do candidato com skills, preferencias e experiencia.
  - Agregacao normalizada de vagas por adapters oficiais/autorizados.
  - Ranking de vagas por score e razoes de aderencia.
  - Editor assistido de curriculo e carta.
  - Fluxo de candidatura com confirmacao manual obrigatoria.
  - Kanban de candidaturas.
  - Notificacoes e lembretes planejados via worker.
- Nao funcionais:
  - PT-BR first, responsivo, acessivel.
  - Modularidade por servicos.
  - Logs e auditoria para acoes sensiveis.
  - Preparado para PostgreSQL, Redis e workers.
- Contratos que nao podem quebrar:
  - Nenhuma candidatura pode ser enviada sem confirmacao explicita.
  - Nenhum adapter pode raspar plataforma sem permissao/autorizacao.
  - Dados de curriculo, tokens e credenciais devem ser tratados como sensiveis.

## Setores ativados

- Produto/Projeto: roadmap, escopo MVP e criterios de aceite.
- Frontend: app shell, dashboard, filtros, Kanban, modal de candidatura e editor assistido.
- Backend/APIs: FastAPI, schemas, services e adapters.
- Infra: docker-compose planejado, envs e readiness.
- Dados: modelos para usuarios, perfis, vagas, candidaturas e documentos.
- IA/Automacao: matching, parsing, tailoring e guardrails.
- QA: testes unitarios iniciais e smoke local.
- Design/UX: experiencia minimalista, clara e orientada a acao.
- Seguranca: consentimento, tokens, privacidade e auditoria.
- Analytics: metricas de funil e resposta planejadas.
- Marketing/Growth: fora do MVP tecnico inicial.
- Legal/Compliance: categoria 3, acao iniciada pelo usuario.
- Suporte/Operacoes: docs e troubleshooting.
- Documentacao: arquitetura, compliance, API e roadmap.

## Plano de entrega

1. Diagnostico: ler PDF, extrair requisitos e riscos.
2. Implementacao minima: criar monorepo, API modular e frontend funcional.
3. Validacao: rodar lint/build/test quando dependencias existirem.
4. Registro final: listar arquivos, decisoes, comandos e proximos passos.

## Criterios de aceite

- Projeto abre localmente com estrutura clara.
- Frontend tem tela principal utilizavel, responsiva e sem botoes inertes no fluxo principal.
- Backend tem endpoints e services coerentes com o produto.
- Guardrails de confirmacao manual aparecem no frontend e no backend.
- Documentacao explica compliance e arquitetura.

## Validacao obrigatoria

- `pnpm install` e `pnpm run build` em `apps/web`, quando autorizado.
- `pip install -e ".[dev]"` e `pytest` em `apps/api`, quando autorizado.
- Smoke manual no dashboard e fluxo de aplicacao assistida.
