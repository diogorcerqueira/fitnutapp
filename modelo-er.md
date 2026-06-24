# Modelo Entidade-Relação

O sistema adopta o padrão **Database per Service**: cada microserviço tem o seu próprio schema PostgreSQL isolado. As referências cruzadas entre serviços (ex: `user_id`) são **referências lógicas** propagadas via JWT ou eventos RabbitMQ — não existem FKs físicas entre schemas.

---

## Schema `auth` (Auth Service)

Centraliza identidade, autenticação e objetivos físicos do utilizador.

```mermaid
erDiagram
    users {
        text id PK
        text name
        text email UK
        text password_hash
        text google_id UK
        timestamp created_at
        timestamp updated_at
    }
    refresh_tokens {
        text id PK
        text user_id FK
        text token_hash
        timestamp expires_at
        timestamp created_at
    }
    profiles {
        text id PK
        text user_id FK
        float weight_kg
        float height_cm
        int age
        text goal
        text gender
        text activity_level
        timestamp updated_at
    }
    goals {
        text id PK
        text user_id FK
        float target_weight_kg
        int daily_calories_kcal
        int daily_protein_g
        timestamp created_at
        timestamp updated_at
    }

    users ||--o{ refresh_tokens : "emite"
    users ||--o| profiles : "tem"
    users ||--o| goals : "define"
```

---

## Schema `workout` (Workout Service)

Catálogo de exercícios, planos de treino e histórico de execuções.

```mermaid
erDiagram
    exercises {
        text id PK
        text external_id UK
        text name
        text muscle_group
        text equipment
        text description
    }
    workout_plans {
        text id PK
        text user_id
        text name
        text state
        jsonb evaluation
        timestamp created_at
        timestamp updated_at
    }
    workout_plan_exercises {
        text id PK
        text plan_id FK
        text exercise_id FK
        int sets
        int reps
        float target_weight_kg
    }
    workout_logs {
        text id PK
        text user_id
        text plan_id FK
        timestamp executed_at
        timestamp created_at
    }
    workout_log_exercises {
        text id PK
        text log_id FK
        text exercise_id FK
        int sets
        int reps
        float weight_kg
    }

    workout_plans ||--o{ workout_plan_exercises : "contém"
    exercises ||--o{ workout_plan_exercises : "usado em"
    workout_plans ||--o{ workout_logs : "origina"
    workout_logs ||--o{ workout_log_exercises : "regista"
    exercises ||--o{ workout_log_exercises : "usado em"
```

**Nota:** `workout_plans.user_id` e `workout_logs.user_id` são referências lógicas ao `auth.users.id` — extraídas do JWT, sem FK física entre schemas.

---

## Schema `nutrition` (Nutrition Service)

Cache de alimentos, registo de refeições, cache de objetivos e rastreio de notificações.

```mermaid
erDiagram
    foods {
        text id PK
        text external_id UK
        text name
        float calories
        float protein_g
        float carbs_g
        float fat_g
        text source
        timestamp cached_at
    }
    meal_entries {
        text id PK
        text user_id
        text food_id FK
        text meal_type
        float quantity_g
        timestamp logged_at
        timestamp created_at
    }
    goal_notifications {
        text id PK
        text user_id
        text goal_type
        timestamp notified_at
    }
    user_goal_cache {
        text user_id PK
        text email
        int daily_calories_kcal
        int daily_protein_g
        timestamp updated_at
    }

    foods ||--o{ meal_entries : "referenciado em"
```

**Nota:** `user_goal_cache` é uma cópia local de dados do schema `auth` — populada via eventos RabbitMQ (`GoalUpdated`, `UserRegistered`) para eliminar acoplamento síncrono entre serviços.

---

## Schema `ai` (AI Recommendation Service)

Snapshots de perfil, histórico de eventos acumulados, recomendações e avaliações de planos geradas por LLM.

```mermaid
erDiagram
    user_snapshots {
        varchar user_id PK
        varchar email
        float weight_kg
        float height_cm
        int age
        varchar goal
        varchar available_equipment
        timestamp updated_at
    }
    workout_events {
        varchar event_id PK
        varchar user_id
        timestamp completed_at
        int exercises_count
    }
    meal_events {
        varchar event_id PK
        varchar user_id
        timestamp logged_at
        varchar meal_type
        float calories
        float protein_g
        float carbs_g
        float fat_g
    }
    recommendations {
        varchar event_id PK
        varchar user_id
        text recommendation
        varchar focus_area
        timestamp created_at
    }
    workout_plan_evaluations {
        varchar event_id PK
        varchar workout_plan_id
        varchar user_id
        text general_assessment
        text suggestions
        text goal_adequacy
        timestamp evaluated_at
    }
```

**Nota:** Todas as tabelas do schema `ai` são independentes — sem FKs físicas. A idempotência é garantida pela PK `event_id` (`INSERT ... ON CONFLICT DO NOTHING`). O `workout_plan_id` é referência lógica ao `workout.workout_plans.id`.

---

## Notification Service

Serviço puramente event-driven — sem base de dados própria. Consome eventos RabbitMQ e envia emails via SMTP (Mailpit em desenvolvimento). Não persiste estado.
