# Dicionário de Dados

---

## Schema `auth`

#### Tabela `auth.users`

| Campo | Descrição | Tipo | Nulo? | Chave | Restrições / Notas |
|---|---|---|---|---|---|
| id | Identificador único do utilizador | TEXT | NÃO | PK | UUID v4 gerado automaticamente |
| name | Nome completo | TEXT | NÃO | — | — |
| email | Endereço de email | TEXT | NÃO | UK | Único; usado para linking automático Google OAuth |
| password_hash | Hash bcrypt da password | TEXT | SIM | — | NULL quando registo exclusivo via Google OAuth |
| google_id | Identificador da conta Google | TEXT | SIM | UK | NULL quando registo email/password |
| created_at | Data de criação | TIMESTAMP(3) | NÃO | — | Default: `now()` |
| updated_at | Data da última atualização | TIMESTAMP(3) | NÃO | — | Auto-update em cada escrita |

#### Tabela `auth.refresh_tokens`

| Campo | Descrição | Tipo | Nulo? | Chave | Restrições / Notas |
|---|---|---|---|---|---|
| id | Identificador único do token | TEXT | NÃO | PK | UUID v4 |
| user_id | Utilizador a quem pertence | TEXT | NÃO | FK→users.id | `ON DELETE CASCADE` |
| token_hash | Hash SHA-256 do refresh token | TEXT | NÃO | — | Token real nunca persistido |
| expires_at | Data de expiração | TIMESTAMP(3) | NÃO | — | TTL: 7 dias a partir da emissão |
| created_at | Data de emissão | TIMESTAMP(3) | NÃO | — | Default: `now()` |

#### Tabela `auth.profiles`

| Campo | Descrição | Tipo | Nulo? | Chave | Restrições / Notas |
|---|---|---|---|---|---|
| id | Identificador único | TEXT | NÃO | PK | UUID v4 |
| user_id | Utilizador proprietário | TEXT | NÃO | FK→users.id, UK | 1:1 com `users`; `ON DELETE CASCADE` |
| weight_kg | Peso atual em kg | DOUBLE PRECISION | SIM | — | — |
| height_cm | Altura em cm | DOUBLE PRECISION | SIM | — | — |
| age | Idade em anos | INTEGER | SIM | — | — |
| goal | Objetivo físico | TEXT (enum) | SIM | — | Valores: `lose_weight`, `maintain_weight`, `gain_muscle` |
| gender | Sexo biológico | TEXT (enum) | SIM | — | Valores: `male`, `female`; necessário para cálculo TDEE (Mifflin-St Jeor) |
| activity_level | Nível de atividade física | TEXT (enum) | SIM | — | Valores: `sedentary`, `light`, `moderate`, `active`, `very_active` |
| updated_at | Data da última atualização | TIMESTAMP(3) | NÃO | — | Auto-update |

#### Tabela `auth.goals`

| Campo | Descrição | Tipo | Nulo? | Chave | Restrições / Notas |
|---|---|---|---|---|---|
| id | Identificador único | TEXT | NÃO | PK | UUID v4 |
| user_id | Utilizador proprietário | TEXT | NÃO | FK→users.id, UK | 1:1 com `users`; `ON DELETE CASCADE` |
| target_weight_kg | Peso alvo em kg | DOUBLE PRECISION | SIM | — | Campo mantido no schema; removido da UI por ser não acionável sem prazo |
| daily_calories_kcal | Meta calórica diária (kcal) | INTEGER | SIM | — | Calculado via TDEE; fórmula Mifflin-St Jeor × fator de atividade |
| daily_protein_g | Meta proteica diária (g) | INTEGER | SIM | — | Calculado via slider 1,2–2,4 g/kg de peso corporal |
| created_at | Data de criação | TIMESTAMP(3) | NÃO | — | Default: `now()` |
| updated_at | Data da última atualização | TIMESTAMP(3) | NÃO | — | Auto-update |

---

## Schema `workout`

#### Tabela `workout.exercises`

| Campo | Descrição | Tipo | Nulo? | Chave | Restrições / Notas |
|---|---|---|---|---|---|
| id | Identificador único | TEXT | NÃO | PK | UUID v4 |
| external_id | ID original da ExerciseDB | TEXT | NÃO | UK | Usado para upsert idempotente no seed inicial |
| name | Nome do exercício | TEXT | NÃO | — | — |
| muscle_group | Grupo muscular alvo | TEXT | NÃO | — | Ex: `chest`, `back`, `legs`; default `General` se ausente na API |
| equipment | Equipamento necessário | TEXT | NÃO | — | Ex: `barbell`, `dumbbell`; default `Body Weight` se ausente |
| description | Instruções de execução | TEXT | SIM | — | — |

#### Tabela `workout.workout_plans`

| Campo | Descrição | Tipo | Nulo? | Chave | Restrições / Notas |
|---|---|---|---|---|---|
| id | Identificador único | TEXT | NÃO | PK | UUID v4 |
| user_id | Utilizador proprietário | TEXT | NÃO | — | Referência lógica ao `auth.users.id` via JWT |
| name | Nome do plano | TEXT | NÃO | — | — |
| state | Estado do ciclo de vida | TEXT (enum) | NÃO | — | Valores: `draft`, `ready`, `completed`; default `draft`; volta a `draft` quando plano `ready` é editado |
| evaluation | Resultado da avaliação por IA | JSONB | SIM | — | Estrutura: `{general_assessment, suggestions[], goal_adequacy}`; NULL até avaliação concluída |
| created_at | Data de criação | TIMESTAMP(3) | NÃO | — | Default: `now()` |
| updated_at | Data da última atualização | TIMESTAMP(3) | NÃO | — | Auto-update |

#### Tabela `workout.workout_plan_exercises`

| Campo | Descrição | Tipo | Nulo? | Chave | Restrições / Notas |
|---|---|---|---|---|---|
| id | Identificador único | TEXT | NÃO | PK | UUID v4 |
| plan_id | Plano a que pertence | TEXT | NÃO | FK→workout_plans.id | `ON DELETE CASCADE` |
| exercise_id | Exercício referenciado | TEXT | NÃO | FK→exercises.id | — |
| sets | Número de séries | INTEGER | NÃO | — | — |
| reps | Repetições por série | INTEGER | NÃO | — | — |
| target_weight_kg | Peso alvo (kg) | DOUBLE PRECISION | SIM | — | NULL = exercício sem peso (corpo) |

#### Tabela `workout.workout_logs`

| Campo | Descrição | Tipo | Nulo? | Chave | Restrições / Notas |
|---|---|---|---|---|---|
| id | Identificador único | TEXT | NÃO | PK | UUID v4 |
| user_id | Utilizador que executou | TEXT | NÃO | — | Referência lógica ao `auth.users.id` via JWT |
| plan_id | Plano executado | TEXT | SIM | FK→workout_plans.id | NULL para treinos ad-hoc sem plano associado |
| executed_at | Data/hora de execução | TIMESTAMP(3) | NÃO | — | — |
| created_at | Data de criação do registo | TIMESTAMP(3) | NÃO | — | Default: `now()` |

#### Tabela `workout.workout_log_exercises`

| Campo | Descrição | Tipo | Nulo? | Chave | Restrições / Notas |
|---|---|---|---|---|---|
| id | Identificador único | TEXT | NÃO | PK | UUID v4 |
| log_id | Log a que pertence | TEXT | NÃO | FK→workout_logs.id | `ON DELETE CASCADE` |
| exercise_id | Exercício realizado | TEXT | NÃO | FK→exercises.id | — |
| sets | Séries realizadas | INTEGER | NÃO | — | — |
| reps | Repetições realizadas | INTEGER | NÃO | — | — |
| weight_kg | Peso utilizado (kg) | DOUBLE PRECISION | NÃO | — | 0.0 para exercícios sem carga |

---

## Schema `nutrition`

#### Tabela `nutrition.foods`

| Campo | Descrição | Tipo | Nulo? | Chave | Restrições / Notas |
|---|---|---|---|---|---|
| id | Identificador único | TEXT | NÃO | PK | UUID v4 |
| external_id | Código de barras / ID Open Food Facts | TEXT | SIM | UK | NULL para alimentos manuais (`source = manual`) |
| name | Nome do alimento | TEXT | NÃO | — | — |
| calories | Calorias por 100g (kcal) | DOUBLE PRECISION | NÃO | — | — |
| protein_g | Proteína por 100g (g) | DOUBLE PRECISION | NÃO | — | — |
| carbs_g | Hidratos de carbono por 100g (g) | DOUBLE PRECISION | NÃO | — | — |
| fat_g | Gordura por 100g (g) | DOUBLE PRECISION | NÃO | — | — |
| source | Origem do registo | TEXT (enum) | NÃO | — | Valores: `open_food_facts`, `manual`; default `open_food_facts` |
| cached_at | Data de cache | TIMESTAMP(3) | SIM | — | NULL para alimentos manuais; TTL: 30 dias para Open Food Facts |

#### Tabela `nutrition.meal_entries`

| Campo | Descrição | Tipo | Nulo? | Chave | Restrições / Notas |
|---|---|---|---|---|---|
| id | Identificador único | TEXT | NÃO | PK | UUID v4 |
| user_id | Utilizador que registou | TEXT | NÃO | — | Referência lógica ao `auth.users.id` via JWT |
| food_id | Alimento consumido | TEXT | NÃO | FK→foods.id | — |
| meal_type | Tipo de refeição | TEXT (enum) | NÃO | — | Valores: `breakfast`, `lunch`, `snack`, `dinner` |
| quantity_g | Quantidade consumida (g) | DOUBLE PRECISION | NÃO | — | — |
| logged_at | Data/hora da refeição | TIMESTAMP(3) | NÃO | — | Aceita datas futuras — suporte a planeamento de refeições |
| created_at | Data de criação | TIMESTAMP(3) | NÃO | — | Default: `now()` |

#### Tabela `nutrition.goal_notifications`

| Campo | Descrição | Tipo | Nulo? | Chave | Restrições / Notas |
|---|---|---|---|---|---|
| id | Identificador único | TEXT | NÃO | PK | UUID v4 |
| user_id | Utilizador notificado | TEXT | NÃO | — | Referência lógica ao `auth.users.id` |
| goal_type | Tipo de objetivo atingido | TEXT | NÃO | — | Ex: `calories`, `protein`, `weight` |
| notified_at | Data/hora da notificação | TIMESTAMP(3) | NÃO | — | Default: `now()` |

#### Tabela `nutrition.user_goal_cache`

| Campo | Descrição | Tipo | Nulo? | Chave | Restrições / Notas |
|---|---|---|---|---|---|
| user_id | Identificador do utilizador | TEXT | NÃO | PK | Referência lógica ao `auth.users.id`; sem FK física (schemas separados) |
| email | Email do utilizador | TEXT | NÃO | — | Cópia local; necessário para publicar evento `GoalReached` |
| daily_calories_kcal | Meta calórica diária (kcal) | INTEGER | SIM | — | NULL até utilizador definir objetivos no Auth Service |
| daily_protein_g | Meta proteica diária (g) | INTEGER | SIM | — | NULL até utilizador definir objetivos no Auth Service |
| updated_at | Data da última atualização | TIMESTAMP(3) | NÃO | — | Auto-update via evento `GoalUpdated` |

---

## Schema `ai`

#### Tabela `ai.user_snapshots`

| Campo | Descrição | Tipo | Nulo? | Chave | Restrições / Notas |
|---|---|---|---|---|---|
| user_id | Identificador do utilizador | VARCHAR | NÃO | PK | Referência lógica ao `auth.users.id` |
| email | Email do utilizador | VARCHAR | NÃO | — | Guardado via `UserRegistered`; necessário para enviar notificações |
| weight_kg | Peso em kg | FLOAT | SIM | — | Atualizado via `ProfileUpdated` |
| height_cm | Altura em cm | FLOAT | SIM | — | Atualizado via `ProfileUpdated` |
| age | Idade em anos | INTEGER | SIM | — | Atualizado via `ProfileUpdated` |
| goal | Objetivo físico | VARCHAR | SIM | — | Valores: `lose_weight`, `maintain_weight`, `gain_muscle` |
| available_equipment | Equipamento disponível | VARCHAR | SIM | — | CSV (ex: `barbell,dumbbells`); gerido por `PUT /api/v1/ai/preferences` |
| updated_at | Data da última atualização | TIMESTAMP | NÃO | — | — |

#### Tabela `ai.workout_events`

| Campo | Descrição | Tipo | Nulo? | Chave | Restrições / Notas |
|---|---|---|---|---|---|
| event_id | ID do evento RabbitMQ | VARCHAR | NÃO | PK | UUID do evento `WorkoutCompleted`; garante idempotência via `ON CONFLICT DO NOTHING` |
| user_id | Utilizador que treinou | VARCHAR | NÃO | INDEX | — |
| completed_at | Data/hora do treino | TIMESTAMP | NÃO | — | — |
| exercises_count | Número de exercícios realizados | INTEGER | SIM | — | — |

#### Tabela `ai.meal_events`

| Campo | Descrição | Tipo | Nulo? | Chave | Restrições / Notas |
|---|---|---|---|---|---|
| event_id | ID do evento RabbitMQ | VARCHAR | NÃO | PK | UUID do evento `MealLogged`; garante idempotência |
| user_id | Utilizador que registou | VARCHAR | NÃO | INDEX | — |
| logged_at | Data/hora da refeição | TIMESTAMP | NÃO | — | — |
| meal_type | Tipo de refeição | VARCHAR | SIM | — | Ex: `breakfast`, `lunch`, `snack`, `dinner` |
| calories | Calorias da refeição (kcal) | FLOAT | SIM | — | Calculado no Nutrition Service: `(quantity_g / 100) × food.calories` |
| protein_g | Proteína da refeição (g) | FLOAT | SIM | — | — |
| carbs_g | Hidratos de carbono (g) | FLOAT | SIM | — | — |
| fat_g | Gordura (g) | FLOAT | SIM | — | — |

#### Tabela `ai.recommendations`

| Campo | Descrição | Tipo | Nulo? | Chave | Restrições / Notas |
|---|---|---|---|---|---|
| event_id | Identificador único | VARCHAR | NÃO | PK | UUID gerado no AI Service |
| user_id | Utilizador destinatário | VARCHAR | NÃO | INDEX | — |
| recommendation | Texto da recomendação | TEXT | NÃO | — | Gerado pelo LLM (OpenRouter); em PT-PT |
| focus_area | Área de foco | VARCHAR | SIM | — | Valores: `nutrition`, `workout`, `recovery` |
| created_at | Data de criação | TIMESTAMP | NÃO | — | Default: `now()` |

#### Tabela `ai.workout_plan_evaluations`

| Campo | Descrição | Tipo | Nulo? | Chave | Restrições / Notas |
|---|---|---|---|---|---|
| event_id | ID do evento RabbitMQ | VARCHAR | NÃO | PK | UUID do evento `WorkoutPlanEvaluationRequested`; garante idempotência |
| workout_plan_id | Plano avaliado | VARCHAR | NÃO | INDEX | Referência lógica ao `workout.workout_plans.id` |
| user_id | Utilizador proprietário | VARCHAR | NÃO | — | — |
| general_assessment | Avaliação geral do plano | TEXT | SIM | — | Gerado pelo LLM; preenchido após `WorkoutPlanEvaluated` |
| suggestions | Sugestões de melhoria | TEXT | SIM | — | JSON array serializado como TEXT |
| goal_adequacy | Adequação ao objetivo do utilizador | TEXT | SIM | — | Gerado pelo LLM |
| evaluated_at | Data da avaliação | TIMESTAMP | NÃO | — | Default: `now()` |
