# Integração de APIs Externas

O sistema integra 4 APIs externas, cada uma consumida por um microserviço específico.

| API | Fornecedor | Finalidade | Serviço consumidor | Autenticação |
|---|---|---|---|---|
| Open Food Facts | Open Food Facts (comunidade) | Dados nutricionais de alimentos | Nutrition Service | Nenhuma (dados abertos) |
| ExerciseDB | AscendAPI / RapidAPI | Catálogo de exercícios com grupos musculares | Workout Service | API Key (`X-RapidAPI-Key`) |
| OpenRouter | OpenRouter.ai | Geração de recomendações, avaliações de planos e resumos semanais por LLM | AI Recommendation Service | Bearer token (`OPENROUTER_API_KEY`) |
| Mailpit (SMTP) | Mailpit (container local) | Envio de emails transacionais e notificações | Notification Service | Nenhuma (rede Docker interna) |

---

## 1. Open Food Facts

**Fornecedor:** https://world.openfoodfacts.org  
**Serviço consumidor:** Nutrition Service (`nutrition-service/src/infrastructure/external/open-food-facts.client.js`)  
**Autenticação:** Nenhuma — API pública sem chave

### Endpoint utilizado

```
GET https://world.openfoodfacts.org/cgi/search.pl
```

**Parâmetros de query:**

| Parâmetro | Valor | Descrição |
|---|---|---|
| `search_terms` | string (nome do alimento) | Termo de pesquisa |
| `search_simple` | `1` | Pesquisa simples por nome |
| `action` | `process` | Modo de processamento |
| `json` | `1` | Resposta em JSON |
| `page_size` | `10` | Máximo de resultados |
| `fields` | `id,product_name,nutriments` | Campos a retornar (filtragem server-side) |

**Exemplo de chamada:**
```
GET https://world.openfoodfacts.org/cgi/search.pl?search_terms=frango&json=1&page_size=10&fields=id,product_name,nutriments
```

**Resposta (JSON):**
```json
{
  "products": [
    {
      "id": "3017620425035",
      "product_name": "Frango Assado",
      "nutriments": {
        "energy-kcal_100g": 165,
        "proteins_100g": 31,
        "carbohydrates_100g": 0,
        "fat_100g": 3.6
      }
    }
  ]
}
```

**Campos consumidos:**

| Campo API | Campo interno | Notas |
|---|---|---|
| `p.id` | `externalId` | Código de barras / ID Open Food Facts |
| `p.product_name` | `name` | Nome do produto |
| `p.nutriments['energy-kcal_100g']` | `calories` | kcal por 100g; default 0 se ausente |
| `p.nutriments['proteins_100g']` | `proteinG` | Proteína por 100g |
| `p.nutriments['carbohydrates_100g']` | `carbsG` | Hidratos de carbono por 100g |
| `p.nutriments['fat_100g']` | `fatG` | Gordura por 100g |

### Estratégia de cache

```
searchFood(name)
  ├── Consulta cache local (nutrition.foods)
  ├── Se resultados frescos encontrados → devolve cache (sem chamada API)
  └── Se sem resultados frescos:
        ├── Chama Open Food Facts API (timeout: 8s)
        ├── Guarda resultados em nutrition.foods (cachedAt = now)
        └── Se API falha → devolve cache stale como fallback
```

**TTL da cache:** 30 dias. Alimentos com `source = 'manual'` nunca expiram.

### Tratamento de erros

| Situação | Comportamento |
|---|---|
| Timeout (> 8s) | `console.warn` + devolve cache local (potencialmente stale) |
| API indisponível (rede) | Idem |
| Produto sem `product_name` ou `nutriments` | Filtrado antes de persistir — não entra na BD |
| Alimento não encontrado na API | Utilizador pode registar macros manualmente; guardado com `source = 'manual'` |

### Rate limits e custos

| Critério | Detalhe |
|---|---|
| Autenticação | Nenhuma |
| Limite de requests | Sem limite oficial; uso responsável requerido |
| Custo | Gratuito (base de dados comunitária aberta) |
| Privacidade | Sem dados do utilizador enviados — apenas o nome do alimento como query string |

---

## 2. ExerciseDB (RapidAPI)

**Fornecedor:** AscendAPI via RapidAPI (`edb-with-videos-and-images-by-ascendapi.p.rapidapi.com`)  
**Serviço consumidor:** Workout Service (`workout-service/src/infrastructure/external/exercisedb.client.js`)  
**Autenticação:** API Key via header `X-RapidAPI-Key`

### Endpoint utilizado

```
GET https://edb-with-videos-and-images-by-ascendapi.p.rapidapi.com/api/v1/exercises
```

**Headers obrigatórios:**

```http
X-RapidAPI-Key: <EXERCISEDB_API_KEY>
X-RapidAPI-Host: edb-with-videos-and-images-by-ascendapi.p.rapidapi.com
```

**Parâmetros de query:**

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `limit` | integer | Máximo de resultados (fixo: 20) |
| `name` | string (opcional) | Filtro por nome do exercício |
| `targetMuscle` | string (opcional) | Filtro por grupo muscular |
| `equipment` | string (opcional) | Filtro por equipamento |

**Resposta (JSON):**
```json
{
  "data": [
    {
      "exerciseId": "0001",
      "name": "Barbell Bench Press",
      "targetMuscles": ["pectorals"],
      "bodyParts": ["chest"],
      "equipments": ["barbell"],
      "gifUrl": "...",
      "videoUrl": "..."
    }
  ]
}
```

**Campos consumidos:**

| Campo API | Campo interno | Notas |
|---|---|---|
| `ex.exerciseId` | `externalId` | ID único para upsert idempotente |
| `ex.name` | `name` | — |
| `ex.targetMuscles[0]` | `muscleGroup` | Fallback: `bodyParts[0]` → `'General'` |
| `ex.equipments[0]` | `equipment` | Fallback: `'Body Weight'` |

### Estratégia de seed + cache

A ExerciseDB tem quota horária reduzida no plano BASIC (RapidAPI). Por isso, a estratégia adoptada evita **qualquer chamada à API em runtime**:

```
Arranque do container Workout Service:
  └── node scripts/seed-exercises.js
        └── Lê seeds/exercises.json (committed no repositório)
              └── upsertMany() → workout.exercises
                    (tolerante a ficheiro ausente — skip silencioso)

Pesquisa de exercícios em runtime (GET /api/v1/workouts/exercises):
  ├── Consulta workout.exercises (BD local)
  ├── Se ≥ 5 resultados → devolve sem chamada API
  └── Se < 5 resultados E EXERCISEDB_API_KEY definida:
        ├── Chama ExerciseDB (timeout: 8s)
        ├── upsertMany() na BD local
        └── Se falha → devolve resultados locais
```

O ficheiro `seeds/exercises.json` contém ~200 exercícios gerados numa única chamada à API (`limit=500`) e committed no repositório. Zero requests à API em runtime normal.

### Tratamento de erros

| Situação | Comportamento |
|---|---|
| 429 Too Many Requests | `console.warn` + devolve BD local |
| Timeout (> 8s) | `console.warn` + devolve BD local |
| `EXERCISEDB_API_KEY` ausente | Skip da chamada API; devolve apenas BD local |
| Campo `targetMuscles` vazio | Fallback para `bodyParts[0]`; se também vazio → `'General'` |
| Campo `equipments` vazio | Fallback: `'Body Weight'` |

### Rate limits e custos

| Critério | Detalhe |
|---|---|
| Autenticação | API Key via `X-RapidAPI-Key` |
| Limite (plano BASIC) | Quota horária — em demo, esgota rapidamente |
| Custo | Gratuito (plano BASIC RapidAPI) |
| Privacidade | Sem dados do utilizador enviados — apenas parâmetros de pesquisa |
| Mitigação | Seed committed no repositório; API só chamada em fallback |

---

## 3. OpenRouter (LLM)

**Fornecedor:** OpenRouter.ai (`openrouter.ai/api/v1`)  
**Serviço consumidor:** AI Recommendation Service (`ai-service/app/infrastructure/external/gemini_client.py`)  
**Autenticação:** Bearer token (`OPENROUTER_API_KEY`)  
**Modelo em uso:** `openai/gpt-oss-20b:free` (configurável via env var `LLM_MODEL`)

> **Nota:** O ficheiro chama-se `gemini_client.py` por razões históricas — a integração migrou do Google Gemini para OpenRouter (ver `report.md` P16). O cliente usa a SDK `openai` compatível com a API do OpenRouter.

### Endpoint utilizado

```
POST https://openrouter.ai/api/v1/chat/completions
```

**Headers:**
```http
Authorization: Bearer <OPENROUTER_API_KEY>
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "model": "openai/gpt-oss-20b:free",
  "messages": [
    { "role": "user", "content": "<prompt>" }
  ]
}
```

**Resposta (JSON):**
```json
{
  "choices": [
    {
      "message": {
        "content": "{ \"recommendation\": \"...\", \"focus_area\": \"nutrition\" }"
      }
    }
  ]
}
```

### Três casos de uso e estrutura dos prompts

#### 3.1 Recomendação personalizada (`generate_recommendation`)

**Gatilho:** Evento `WorkoutCompleted` ou `MealLogged` recebido via RabbitMQ.

**Dados enviados ao LLM (sem PII — sem nome, email ou ID):**
```
Utilizador com objetivo: perda de peso
Peso atual: 82 kg | Altura: 175 cm | Idade: 30 anos
Equipamento disponível: barbell,dumbbells

Última semana:
- Treinos realizados: 3
- Média calórica diária: 1850 kcal (meta: 2000 kcal)
- Média proteica diária: 95g (meta: 140g)

Gera uma recomendação curta (máx. 3 frases) em português europeu...
Responde APENAS em JSON: { "recommendation": "...", "focus_area": "nutrition|workout|recovery" }
```

**Resposta esperada:**
```json
{ "recommendation": "A ingestão proteica está abaixo da meta. Considera adicionar uma fonte de proteína ao jantar.", "focus_area": "nutrition" }
```

#### 3.2 Avaliação de plano de treino (`evaluate_workout_plan`)

**Gatilho:** Evento `WorkoutPlanEvaluationRequested` via RabbitMQ.

**Dados enviados ao LLM:**
```
Utilizador com objetivo: ganho de massa muscular
Peso: 75kg | Altura: 178cm | Idade: 25 anos

Plano de treino: "Push Day — Peito e Tríceps"
Grupos musculares trabalhados: pectorals, triceps.
Exercícios:
- Barbell Bench Press (pectorals): 4 séries × 8 repetições | peso alvo: 80kg
- Tricep Pushdown (triceps): 3 séries × 12 repetições

Avalia em português europeu e responde APENAS em JSON:
{ "general_assessment": "...", "suggestions": ["..."], "goal_adequacy": "..." }
```

**Resposta esperada:**
```json
{
  "general_assessment": "Plano coerente com o nome. Volume adequado para hipertrofia.",
  "suggestions": ["Adicionar exercício de isolamento para peito inferior", "Incluir tríceps overhead"],
  "goal_adequacy": "Adequado para ganho de massa muscular — foco em grupos relevantes com carga progressiva."
}
```

#### 3.3 Resumo semanal (`generate_weekly_summary`)

**Gatilho:** Cron `0 8 * * 1` (segunda-feira 08:00).

**Dados enviados ao LLM:**
```
Gera um resumo semanal em português europeu para um utilizador com objetivo: manutenção de peso.

Dados da semana:
- Treinos realizados: 4
- Média calórica diária: 2100 kcal
- Média proteica diária: 130g
- Peso mais recente: 78 kg

Responde APENAS em JSON:
{ "workouts_count": 4, "avg_daily_calories": 2100, "latest_weight_kg": 78, "recommendations": ["..."] }
```

### Parsing da resposta

O LLM devolve texto livre — o cliente extrai JSON por expressão regular:

```python
match = re.search(r'\{.*\}', text, re.DOTALL)
return json.loads(match.group())
```

Se nenhum JSON for encontrado na resposta, `ValueError` é lançado e capturado no caso de uso.

### Tratamento de erros

| Situação | HTTP devolvido | Comportamento |
|---|---|---|
| `RateLimitError` (429) | 429 | Erro devolvido ao cliente; sem retry automático; botão de retry na UI admin |
| `APIStatusError` (4xx) | 4xx | Idem |
| JSON inválido na resposta | — | `ValueError` capturado; recomendação não gerada para este evento |
| Modelo indisponível | 404 | Alterar `LLM_MODEL` env var; sem rebuild necessário |

### Rate limits e custos

| Critério | Detalhe |
|---|---|
| Autenticação | Bearer `OPENROUTER_API_KEY` |
| Modelo em uso | `openai/gpt-oss-20b:free` (free tier) |
| Limite | Rate limit variável por modelo no free tier |
| Custo | Gratuito (free tier OpenRouter) |
| Configuração | Modelo alterável via `LLM_MODEL` env var sem rebuild |
| Privacidade | **Métricas agregadas anónimas** — sem nome, email ou ID enviados ao LLM |

---

## 4. Mailpit (SMTP local)

**Fornecedor:** Mailpit (container Docker — `mailhog/mailpit`)  
**Serviço consumidor:** Notification Service (`notification-service/src/infrastructure/external/mailtrap.client.js`)  
**Autenticação:** Nenhuma — rede Docker interna  
**Protocolo:** SMTP via `nodemailer`

> **Nota:** O nome do ficheiro (`mailtrap.client.js`) é histórico — substituído na P9 do `report.md`. O cliente usa `nodemailer` a apontar para Mailpit em vez da API REST do Mailtrap.

### Configuração SMTP

| Parâmetro | Valor | Descrição |
|---|---|---|
| `SMTP_HOST` | `mailpit` (default) | Hostname do container Docker |
| `SMTP_PORT` | `1025` (default) | Porta SMTP do Mailpit |
| `secure` | `false` | Sem TLS na rede interna Docker |
| `auth` | `null` | Sem autenticação |
| `SMTP_FROM_NAME` | `FitnessApp` (default) | Nome do remetente |
| `SMTP_FROM_EMAIL` | `noreply@fitness-app.com` (default) | Email do remetente |

**UI de inspecção:** `http://localhost:8025` — interface web do Mailpit para verificar todos os emails enviados.

### Chamada nodemailer

```javascript
await transporter.sendMail({
  from: `"FitnessApp" <noreply@fitness-app.com>`,
  to: destinatario@email.com,
  subject: "Assunto",
  html: "<p>...</p>",
  text: "...",
});
```

### Cinco tipos de email enviados

| Evento RabbitMQ | Use case | Assunto | Gatilho |
|---|---|---|---|
| `UserRegistered` | `send-welcome-email.js` | Bem-vindo ao FitnessApp | Registo de novo utilizador |
| `GoalReached` | `send-goal-reached-email.js` | Objetivo atingido! | Meta calórica, proteica ou de peso atingida |
| `RecommendationGenerated` | `send-recommendation-email.js` | Nova recomendação disponível | Recomendação LLM gerada |
| `WorkoutPlanEvaluated` | `send-plan-evaluated-email.js` | Plano de treino avaliado | Avaliação de plano concluída pelo LLM |
| `WeeklySummaryGenerated` | `send-weekly-summary-email.js` | Resumo semanal | Cron segunda-feira 08:00 |

### Tratamento de erros

| Situação | Comportamento |
|---|---|
| `to` em falta | `Error('Email recipient is required')` lançado antes da chamada SMTP |
| SMTP indisponível | Excepção `nodemailer` propagada ao consumer; mensagem RabbitMQ não acknowledged — volta à fila |
| Email inválido | `nodemailer` lança erro; idem |

### Rate limits e custos

| Critério | Detalhe |
|---|---|
| Autenticação | Nenhuma (rede Docker interna) |
| Limite | Sem limite (container local) |
| Custo | Gratuito |
| Privacidade | Emails nunca saem da máquina local — Mailpit intercepta tudo; adequado para desenvolvimento e demonstração |

---

## Resumo de Dependências Externas em Runtime

| Serviço | API externa | Impacto se indisponível |
|---|---|---|
| Nutrition Service | Open Food Facts | Pesquisa devolve apenas cache local; alimentos manuais não afectados |
| Workout Service | ExerciseDB | Pesquisa devolve apenas seed local (~200 exercícios); zero impacto em runtime normal |
| AI Service | OpenRouter | Recomendações e avaliações não geradas; emails correspondentes não enviados |
| Notification Service | Mailpit (SMTP) | Emails não enviados; fluxo principal do utilizador não afectado |
| Auth Service | Google OAuth | Login com Google indisponível; login email/password continua a funcionar |
