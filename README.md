# FitnessApp — Sistema de Acompanhamento Físico

Aplicação distribuída baseada em microserviços para acompanhamento de treinos, alimentação e objectivos físicos, com recomendações geradas por IA.

Projecto académico desenvolvido na unidade curricular **Integração de Sistemas** com suporte de Vibe Coding.

---

## Arquitectura

5 microserviços independentes, cada um com a sua própria base de dados (padrão *Database per Service*), comunicando via REST síncrono e RabbitMQ assíncrono, expostos através de um nginx reverse proxy.

```
Cliente (Vue 3)
      │
      ▼
 nginx :8081  ←── reverse proxy / API gateway
      │
      ├── /api/v1/auth/        → Auth Service        :3001  (Node.js + Express + Prisma)
      ├── /api/v1/users/       → Auth Service        :3001
      ├── /api/v1/workouts/    → Workout Service     :3002  (Node.js + Express + Prisma)
      ├── /api/v1/exercises/   → Workout Service     :3002
      ├── /api/v1/nutrition/   → Nutrition Service   :3003  (Node.js + Express + Prisma)
      ├── /api/v1/foods/       → Nutrition Service   :3003
      └── /api/v1/ai/          → AI Service          :3004  (Python + FastAPI + Alembic)

RabbitMQ :5672  ←── exchange fitness.events (topic)
      │
      └── Notification Service :3005  (Node.js + Express + Nodemailer)

PostgreSQL :5436  ←── schemas isolados por serviço (auth, workout, nutrition, ai)
Mailpit    :8025  ←── UI de inspecção de emails (desenvolvimento)
```

### Stack tecnológica

| Serviço | Linguagem | Framework | ORM / Migrações |
|---|---|---|---|
| Auth Service | Node.js | Express | Prisma |
| Workout Service | Node.js | Express | Prisma |
| Nutrition Service | Node.js | Express | Prisma |
| AI Recommendation Service | Python 3.11 | FastAPI | Alembic + SQLAlchemy |
| Notification Service | Node.js | Express | — (sem BD) |

**Infraestrutura:** PostgreSQL 16, RabbitMQ 3, nginx, Docker Compose

---

## Pré-requisitos

- [Docker](https://www.docker.com/) + Docker Compose
- Git

---

## Instalação e arranque

### 1. Clonar o repositório

```bash
git clone <url-do-repositório>
cd int-sist
```

### 2. Configurar variáveis de ambiente

Copiar o ficheiro de exemplo e preencher as chaves:

```bash
cp .env.example .env
```

Editar `.env`:

```env
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
OPENROUTER_API_KEY=<openrouter-api-key>
EXERCISEDB_API_KEY=<rapidapi-key>
LLM_MODEL=openai/gpt-oss-20b:free
```

> As variáveis `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` são opcionais para desenvolvimento — sem elas o Login com Google fica indisponível mas o resto da aplicação funciona normalmente.

### 3. Arrancar todos os serviços

```bash
docker compose up --build
```

O primeiro arranque demora ~2–3 minutos (build de imagens + migrações de BD + seed de exercícios).

### 4. Verificar que está tudo a correr

```bash
docker compose ps
```

Todos os serviços devem estar `Up` ou `healthy`.

---

## Acesso

| Recurso | URL |
|---|---|
| **Frontend** | http://localhost:3000 |
| **API Gateway (nginx)** | http://localhost:8081 |
| **Mailpit** (emails de desenvolvimento) | http://localhost:8025 |
| **RabbitMQ Management** | http://localhost:15672 (guest / guest) |

---

## Documentação das APIs (Swagger)

| Serviço | Via nginx | Directo |
|---|---|---|
| Auth Service | http://localhost:8081/docs/auth/ | http://localhost:3001/api-docs |
| Workout Service | http://localhost:8081/docs/workout/ | http://localhost:3002/api-docs |
| Nutrition Service | http://localhost:8081/docs/nutrition/ | http://localhost:3003/api-docs |
| AI Service | http://localhost:8081/docs/ai/ | http://localhost:3004/docs |
| Notification Service | http://localhost:8081/docs/notification/ | http://localhost:3005/api-docs |

---

## Microserviços

### Auth Service `:3001`
Registo e autenticação (email/password + Google OAuth 2.0). Emite JWT (HS256, 15 min) e refresh tokens (7 dias). Gere perfil físico e objectivos nutricionais (TDEE via Mifflin-St Jeor).

### Workout Service `:3002`
Catálogo de exercícios (seed da ExerciseDB), criação de planos de treino, registo de execuções e histórico. Suporta avaliação assíncrona de planos por IA (fluxo via RabbitMQ).

### Nutrition Service `:3003`
Pesquisa de alimentos via Open Food Facts (cache 30 dias + fallback manual), registo de refeições por tipo e data, cálculo de macronutrientes diários e verificação de metas.

### AI Recommendation Service `:3004`
Acumula dados via eventos RabbitMQ. Gera recomendações personalizadas e avaliações de planos de treino via OpenRouter (LLM). Cron semanal (segunda-feira 08:00) para resumos.

### Notification Service `:3005`
Serviço puramente event-driven — sem BD própria. Consome eventos RabbitMQ e envia emails via SMTP (Mailpit em desenvolvimento).

---

## Eventos RabbitMQ

Exchange `fitness.events` (tipo `topic`):

| Evento | Routing key | Publicado por | Consumido por |
|---|---|---|---|
| `UserRegistered` | `user.registered` | Auth | Notification, AI |
| `ProfileUpdated` | `user.profile.updated` | Auth | AI |
| `GoalUpdated` | `goal.updated` | Auth | Nutrition |
| `WorkoutCompleted` | `workout.completed` | Workout | AI |
| `WorkoutPlanEvaluationRequested` | `workout.plan.evaluation.requested` | Workout | AI |
| `WorkoutPlanEvaluated` | `workout.plan.evaluated` | AI | Workout, Notification |
| `MealLogged` | `meal.logged` | Nutrition | AI |
| `GoalReached` | `goal.reached` | Auth / Nutrition | Notification |
| `RecommendationGenerated` | `recommendation.generated` | AI | Notification |
| `WeeklySummaryGenerated` | `weekly.summary.generated` | AI | Notification |

---

## Variáveis de ambiente

| Variável | Serviços | Descrição |
|---|---|---|
| `JWT_SECRET` | Todos | Segredo partilhado para assinatura/verificação JWT |
| `DATABASE_URL` | Auth, Workout, Nutrition, AI | Connection string PostgreSQL |
| `RABBITMQ_URL` | Todos (excepto frontend) | URL de ligação ao RabbitMQ |
| `GOOGLE_CLIENT_ID` | Auth | Client ID Google OAuth 2.0 |
| `GOOGLE_CLIENT_SECRET` | Auth | Client Secret Google OAuth 2.0 |
| `OPENROUTER_API_KEY` | AI | Chave da API OpenRouter |
| `LLM_MODEL` | AI | Modelo LLM (default: `openai/gpt-oss-20b:free`) |
| `EXERCISEDB_API_KEY` | Workout | Chave RapidAPI para ExerciseDB (opcional em runtime) |
| `SMTP_HOST` | Notification | Host SMTP (default: `mailpit`) |
| `SMTP_PORT` | Notification | Porta SMTP (default: `1025`) |

---

## Documentação técnica

| Documento | Conteúdo |
|---|---|
| [`report.md`](report.md) | Decisões de arquitectura, desvios à spec, 23 problemas resolvidos |
| [`modelo-er.md`](modelo-er.md) | Diagramas ER dos 4 schemas PostgreSQL |
| [`dicionario-dados.md`](dicionario-dados.md) | Todas as tabelas com tipos, restrições e notas |
| [`casos-de-uso.md`](casos-de-uso.md) | 15 casos de uso com actor, pré-condições, fluxo principal e alternativos |
| [`autenticacao-externa.md`](autenticacao-externa.md) | Fluxo Google OAuth 2.0, protecção de rotas, ciclo de vida dos tokens |
| [`integracao-apis-externas.md`](integracao-apis-externas.md) | Open Food Facts, ExerciseDB, OpenRouter, Mailpit — endpoints, formato, erros |
| [`Especificação de Requisitos.md`](Especificação%20de%20Requisitos.md) | RF01–RF17, RNF01–RNF07 |

---

## Comandos úteis

```bash
# Ver logs de um serviço
docker compose logs -f auth-service

# Rebuild de um serviço específico
docker compose up -d --build workout-service

# Parar tudo
docker compose down

# Parar e apagar volumes (reset completo da BD)
docker compose down -v
```
