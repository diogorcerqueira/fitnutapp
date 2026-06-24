# Casos de Uso

## Actores

| Actor | Descrição |
|---|---|
| **Utilizador** | Pessoa registada que acede à aplicação para gerir treinos, alimentação e objetivos |
| **Sistema** | Processos automáticos internos (cron jobs, consumers RabbitMQ) |
| **Google OAuth** | Sistema externo de autenticação da Google |
| **Open Food Facts** | API externa de dados nutricionais |
| **ExerciseDB** | API externa de catálogo de exercícios |
| **OpenRouter / LLM** | API externa de geração de linguagem (recomendações e avaliações) |

---

## UC01 — Registo de Utilizador

**Actor:** Utilizador  
**Serviço:** Auth Service  
**Requisito:** RF01

**Pré-condições:**
- Utilizador não tem conta no sistema.

**Fluxo principal:**
1. Utilizador preenche nome, email e password.
2. Sistema valida que o email não existe.
3. Sistema cria hash bcrypt da password.
4. Sistema cria registo em `auth.users`.
5. Sistema publica evento `UserRegistered` no RabbitMQ.
6. Notification Service consome evento e envia email de boas-vindas.
7. Sistema devolve confirmação de registo.

**Fluxos alternativos:**
- **FA1 — Email já registado com password:** Sistema devolve erro 409. Utilizador deve usar login por credenciais ou recuperar password.
- **FA2 — Email já registado via Google OAuth:** Sistema devolve erro 409 com indicação para usar Login com Google.

---

## UC02 — Autenticação por Credenciais

**Actor:** Utilizador  
**Serviço:** Auth Service  
**Requisito:** RF02

**Pré-condições:**
- Utilizador tem conta com email e password.

**Fluxo principal:**
1. Utilizador submete email e password.
2. Sistema verifica hash bcrypt.
3. Sistema emite access token JWT (HS256, TTL 15 min) e refresh token (TTL 7 dias).
4. Refresh token armazenado em `auth.refresh_tokens` (hash SHA-256).
5. Tokens devolvidos ao cliente.

**Fluxos alternativos:**
- **FA1 — Password incorrecta:** Sistema devolve 401. Token não emitido.
- **FA2 — Email não existe:** Sistema devolve 401 (sem distinguir email/password por segurança).
- **FA3 — Refresh token expirado:** Cliente submete `POST /auth/refresh`; sistema devolve 401; utilizador redirecionado para login.

---

## UC03 — Autenticação via Google OAuth

**Actor:** Utilizador, Google OAuth  
**Serviço:** Auth Service  
**Requisito:** RF02

**Pré-condições:**
- Utilizador tem conta Google.

**Fluxo principal:**
1. Utilizador clica "Login com Google".
2. Auth Service redireciona para página de consentimento Google.
3. Utilizador autoriza acesso.
4. Google redireciona para callback com código de autorização.
5. Auth Service troca código por perfil Google (nome, email, google_id).
6. Sistema verifica se utilizador existe por `google_id` ou `email`.
7. Se não existe, cria conta nova em `auth.users` (sem `password_hash`).
8. Se existe por email (conta criada por credenciais), associa `google_id` automaticamente.
9. Sistema emite JWT e refresh token.
10. Utilizador redirecionado para a aplicação autenticado.

**Fluxos alternativos:**
- **FA1 — Utilizador cancela consentimento Google:** Callback recebe erro; utilizador redirecionado para login.
- **FA2 — Credenciais Google inválidas (env vars ausentes):** Estratégia OAuth não registada; endpoints `/auth/google/*` devolvem 404; outros endpoints funcionam normalmente.

---

## UC04 — Gestão de Perfil

**Actor:** Utilizador  
**Serviço:** Auth Service  
**Requisito:** RF03

**Pré-condições:**
- Utilizador autenticado (JWT válido).

**Fluxo principal:**
1. Utilizador consulta `GET /api/v1/users/me/profile`.
2. Sistema devolve dados actuais do perfil.
3. Utilizador edita peso, altura, idade, objectivo, sexo e nível de actividade.
4. Utilizador submete `PUT /api/v1/users/me/profile`.
5. Sistema actualiza `auth.profiles`.
6. Sistema recalcula TDEE (Mifflin-St Jeor) e persiste em `auth.goals`.
7. Sistema publica evento `ProfileUpdated` → AI Service actualiza snapshot local.

**Fluxos alternativos:**
- **FA1 — Dados insuficientes para TDEE (peso/altura/idade/sexo/actividade em falta):** Goals não actualizados automaticamente; campos de meta na tab Nutrição mostram só o consumido (sem referência).

---

## UC05 — Consulta de Exercícios

**Actor:** Utilizador  
**Serviço:** Workout Service  
**Requisito:** RF04

**Pré-condições:**
- Utilizador autenticado.
- Seed de exercícios carregado na BD no arranque do serviço.

**Fluxo principal:**
1. Utilizador pesquisa por nome, grupo muscular ou equipamento.
2. Workout Service consulta `workout.exercises` (BD local).
3. Sistema devolve lista de exercícios com nome, grupo muscular, equipamento e descrição.

**Fluxos alternativos:**
- **FA1 — Sem resultados na BD local:** Sistema devolve lista vazia. O seed de ~200 exercícios da ExerciseDB está committed no repositório e é carregado no arranque — sem chamadas à API em runtime.

---

## UC06 — Criar Plano de Treino

**Actor:** Utilizador  
**Serviço:** Workout Service  
**Requisito:** RF16

**Pré-condições:**
- Utilizador autenticado.
- Catálogo de exercícios disponível (UC05).

**Fluxo principal:**
1. Utilizador cria plano com nome via `POST /api/v1/workouts/plans`.
2. Sistema cria registo em `workout.workout_plans` com estado `draft`.
3. Utilizador adiciona exercícios ao plano (séries, repetições, peso alvo opcional).
4. Sistema cria registos em `workout.workout_plan_exercises`.
5. Plano fica disponível para avaliação (UC07) ou execução directa.

**Fluxos alternativos:**
- **FA1 — Utilizador edita plano em estado `ready`:** Sistema repõe estado para `draft` e limpa `evaluation`. Avaliação anterior torna-se inválida; utilizador deve re-avaliar.

---

## UC07 — Avaliar Plano de Treino por IA

**Actor:** Utilizador, OpenRouter / LLM  
**Serviços:** Workout Service, AI Recommendation Service, Notification Service  
**Requisito:** RF17  
**Nota:** Fluxo assíncrono — desvio justificado à spec original (ver `report.md`)

**Pré-condições:**
- Utilizador autenticado.
- Plano em estado `draft` existe.

**Fluxo principal:**
1. Utilizador submete `POST /api/v1/workouts/plans/:id/evaluate`.
2. Workout Service devolve `202 Accepted` imediatamente.
3. Workout Service publica `WorkoutPlanEvaluationRequested` → RabbitMQ.
4. AI Service consome evento; constrói prompt com dados do plano e perfil do utilizador.
5. AI Service chama OpenRouter (LLM) e obtém avaliação estruturada.
6. AI Service persiste resultado em `ai.workout_plan_evaluations`.
7. AI Service publica `WorkoutPlanEvaluated` → RabbitMQ.
8. Workout Service consome evento; actualiza `workout.workout_plans` com avaliação e estado `ready`.
9. Notification Service consome evento; envia email ao utilizador com a avaliação.

**Fluxos alternativos:**
- **FA1 — LLM rate limit (429):** AI Service captura `RateLimitError`; evento não re-publicado; utilizador recebe email a indicar falha; pode re-submeter pedido.
- **FA2 — Plano inexistente ou não pertence ao utilizador:** Workout Service devolve 404/403 antes de publicar evento.

---

## UC08 — Registar Treino Realizado

**Actor:** Utilizador  
**Serviço:** Workout Service  
**Requisito:** RF05

**Pré-condições:**
- Utilizador autenticado.

**Fluxo principal:**
1. Utilizador submete `POST /api/v1/workouts/logs` com data de execução, exercícios, séries, repetições e pesos reais.
2. Sistema cria registo em `workout.workout_logs` e entradas em `workout.workout_log_exercises`.
3. Sistema publica evento `WorkoutCompleted` → RabbitMQ.
4. AI Service consome evento; persiste em `ai.workout_events`; pode gerar recomendação.

**Fluxos alternativos:**
- **FA1 — Treino associado a plano:** Campo `plan_id` opcional preenchido; registo ligado ao plano.
- **FA2 — Treino ad-hoc (sem plano):** `plan_id` NULL; registo criado sem ligação a plano.

---

## UC09 — Consultar Histórico de Treinos

**Actor:** Utilizador  
**Serviço:** Workout Service  
**Requisito:** RF06

**Pré-condições:**
- Utilizador autenticado.
- Pelo menos um treino registado.

**Fluxo principal:**
1. Utilizador acede a `GET /api/v1/workouts/logs`.
2. Sistema devolve lista de treinos com data, exercícios realizados, séries, repetições e pesos.
3. Utilizador consulta evolução de carga por exercício via `GET /api/v1/workouts/progress/:exerciseId`.
4. Sistema devolve histórico de peso utilizado ao longo do tempo para esse exercício.

---

## UC10 — Registar Refeição

**Actor:** Utilizador  
**Serviço:** Nutrition Service  
**Requisito:** RF07

**Pré-condições:**
- Utilizador autenticado.

**Fluxo principal:**
1. Utilizador pesquisa alimento por nome via `GET /api/v1/nutrition/foods/search?q=...`.
2. Nutrition Service verifica cache local (`nutrition.foods`).
3. Se não encontrado (< 5 resultados em cache), consulta Open Food Facts API.
4. Resultados da API guardados em `nutrition.foods` (TTL 30 dias).
5. Utilizador selecciona alimento e indica tipo de refeição, quantidade (g) e data.
6. Sistema cria registo em `nutrition.meal_entries`.
7. Sistema verifica metas diárias; se atingidas, publica `GoalReached` → Notification Service.
8. Sistema publica `MealLogged` → AI Service acumula dados para recomendações.

**Fluxos alternativos:**
- **FA1 — Alimento não encontrado na Open Food Facts:** Utilizador introduz macros manualmente; sistema cria registo em `nutrition.foods` com `source = manual` (sem TTL).
- **FA2 — Data futura:** Registo criado normalmente; badge "Planeamento" mostrado na UI; MacroCards sem referência de meta (só hoje e datas futuras mostram progresso).
- **FA3 — Metas não definidas (cache vazia):** Verificação de GoalReached retorna null; sem notificação; comportamento idêntico a antes de definir objetivos.

---

## UC11 — Consultar Resumo Nutricional

**Actor:** Utilizador  
**Serviço:** Nutrition Service  
**Requisito:** RF08

**Pré-condições:**
- Utilizador autenticado.

**Fluxo principal:**
1. Utilizador navega para tab de Nutrição (data = hoje por defeito).
2. Sistema consulta `GET /api/v1/nutrition/summary?date=YYYY-MM-DD`.
3. Sistema agrega calorias, proteína, hidratos e gordura de todas as refeições do dia.
4. Sistema consulta `GET /api/v1/users/me/goals` (metas do utilizador).
5. UI apresenta macros no formato consumido/meta (ex: `350/2000 kcal`) com barra de progresso.
6. Utilizador navega para dias anteriores (←) ou futuros (→).

**Fluxos alternativos:**
- **FA1 — Sem refeições no dia seleccionado:** Sistema devolve totais a zero; UI apresenta mensagem contextual ("Sem entradas" / "Sem planeamento").
- **FA2 — Data passada:** MacroCards mostram apenas consumido (sem referência de meta — meta pode ter mudado entretanto).

---

## UC12 — Definir Objetivos Nutricionais

**Actor:** Utilizador  
**Serviço:** Auth Service  
**Requisito:** RF09

**Pré-condições:**
- Utilizador autenticado.
- Perfil com peso, altura, idade, sexo e nível de actividade preenchidos (para TDEE automático).

**Fluxo principal:**
1. Utilizador acede à página de Perfil.
2. Sistema calcula TDEE automaticamente via Mifflin-St Jeor (peso, altura, idade, sexo, actividade).
3. Utilizador ajusta meta proteica via slider (1,2–2,4 g/kg; presets: Manutenção 1,6 / Desempenho 1,9 / Hipertrofia 2,2).
4. Utilizador guarda perfil.
5. Sistema persiste em `auth.goals` e publica `GoalUpdated`.
6. Nutrition Service consome evento; actualiza `nutrition.user_goal_cache`.

**Fluxos alternativos:**
- **FA1 — Perfil incompleto (sem peso/altura/idade/sexo/actividade):** TDEE não calculado; goals não auto-persistidos; utilizador deve preencher dados físicos primeiro.

---

## UC13 — Receber Recomendação por IA

**Actor:** Sistema (trigger automático), Utilizador (destinatário)  
**Serviços:** AI Recommendation Service, Notification Service  
**Requisito:** RF10

**Pré-condições:**
- Utilizador tem snapshot de perfil no AI Service (via `UserRegistered` + `ProfileUpdated`).
- Evento `WorkoutCompleted` ou `MealLogged` publicado.

**Fluxo principal:**
1. AI Service consome evento `WorkoutCompleted` ou `MealLogged`.
2. AI Service constrói prompt com métricas agregadas anónimas do utilizador (sem PII — sem nome/email no prompt).
3. AI Service chama OpenRouter (LLM); obtém `{recommendation, focus_area}` em PT-PT.
4. AI Service persiste em `ai.recommendations`.
5. AI Service publica `RecommendationGenerated` (com `email` no payload).
6. Notification Service consome evento; envia email ao utilizador com recomendação.

**Fluxos alternativos:**
- **FA1 — Snapshot sem email (`email = ''`):** AI Service não publica `RecommendationGenerated`; utilizador não recebe email. Correcção: re-publicar `ProfileUpdated` com email.
- **FA2 — LLM indisponível / rate limit:** Excepção capturada; recomendação não gerada para este evento; próximo evento retenta normalmente.

---

## UC14 — Receber Resumo Semanal

**Actor:** Sistema (cron automático), Utilizador (destinatário)  
**Serviço:** AI Recommendation Service, Notification Service  
**Requisito:** RF11

**Pré-condições:**
- Utilizador teve actividade registada na semana anterior (workout ou meal events).

**Fluxo principal:**
1. Cron `0 8 * * 1` (segunda-feira 08:00) activa no AI Service.
2. AI Service identifica utilizadores com actividade na semana anterior.
3. Para cada utilizador activo, constrói resumo: treinos realizados, média calórica diária, peso mais recente, recomendações da semana.
4. AI Service chama OpenRouter (LLM) com dados agregados.
5. AI Service publica `WeeklySummaryGenerated` → Notification Service.
6. Notification Service envia email com resumo semanal.

**Fluxos alternativos:**
- **FA1 — Utilizador sem actividade na semana:** AI Service não gera resumo para esse utilizador (evita emails vazios).
- **FA2 — LLM rate limit durante o cron:** Utilizadores processados antes do rate limit recebem resumo; restantes não recebem nessa semana.

---

## UC15 — Receber Notificação de Objetivo Atingido

**Actor:** Sistema (trigger automático), Utilizador (destinatário)  
**Serviços:** Auth Service / Nutrition Service, Notification Service  
**Requisito:** RF12

**Pré-condições:**
- Utilizador tem metas definidas em `auth.goals`.
- `nutrition.user_goal_cache` actualizado com metas.

**Fluxo principal (meta calórica ou proteica):**
1. Utilizador regista refeição (UC10).
2. Nutrition Service agrega totais do dia para o utilizador.
3. Se `total_calories >= daily_calories_kcal` ou `total_protein >= daily_protein_g`, Nutrition Service publica `GoalReached`.
4. Notification Service consome evento; envia email de parabéns ao utilizador.

**Fluxo alternativo — meta de peso:**
1. Utilizador actualiza peso no perfil.
2. Auth Service compara `weight_kg` actual com `target_weight_kg`.
3. Se meta atingida, Auth Service publica `GoalReached`.
4. Notification Service envia email.

**Fluxos alternativos:**
- **FA1 — Cache de goals vazia (GoalUpdated ainda não recebido):** Nutrition Service retorna null na verificação; sem notificação nessa sessão.
- **FA2 — Objectivo já notificado hoje:** Registo em `nutrition.goal_notifications` previne notificações repetidas pelo mesmo tipo de objetivo no mesmo dia.
