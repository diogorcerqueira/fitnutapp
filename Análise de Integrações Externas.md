# Análise de Integrações Externas

Documento de suporte à especificação de requisitos. Detalha valor, fluxo de dados, riscos e viabilidade de cada API externa integrada.

---

## 1. Open Food Facts

### Valor acrescentado

Fornece base de dados nutricional (calorias, proteínas, hidratos, gorduras) sem construir catálogo próprio. RF07 e RF08 dependem desta integração.

### Fluxo de dados

```
Utilizador regista alimento
  → Nutrition Service pesquisa por nome ou barcode
  → Open Food Facts API responde com macronutrientes
  → Nutrition Service persiste na BD local (cache)
  → Retorna dados ao utilizador
```

### Riscos

| Risco | Detalhe |
|---|---|
| Qualidade dos dados | Base colaborativa — valores podem estar incompletos ou incorretos |
| Produto não encontrado | Alimentos regionais/genéricos podem não existir |
| Dependência externa | Se API ficar indisponível, registo alimentar fica bloqueado |

### Viabilidade

| Critério | Detalhe |
|---|---|
| Custo | Gratuito, open data |
| Rate limits | Sem limite oficial documentado; pedem uso responsável |
| Autenticação | Nenhuma (acesso de leitura livre) |
| Formato de dados | JSON REST |
| Privacidade | Dados abertos, licença CC-BY-SA; nenhum dado do utilizador enviado |

### Mitigação de riscos

* Cache local de alimentos já pesquisados
* Fallback para input manual de macros quando alimento não encontrado

---

## 2. ExerciseDB (via RapidAPI)

### Valor acrescentado

Catálogo de exercícios com grupo muscular alvo, equipamento necessário e descrição. Elimina necessidade de construir e manter catálogo próprio. RF04 depende desta integração.

### Fluxo de dados

```
Utilizador abre catálogo de exercícios
  → Workout Service consulta BD local (se seed feito)
  → Se não existir, consulta ExerciseDB API
  → Retorna lista filtrada por grupo muscular / equipamento
  → Resultado persistido localmente para requests futuras
```

### Riscos

| Risco | Detalhe |
|---|---|
| Rate limits no free tier | ~100 req/dia no RapidAPI free tier |
| Custo em escala | Tiers pagos necessários acima do free |
| Dependência | Catálogo inacessível se API down (mitigado por seed local) |

### Viabilidade

| Critério | Detalhe |
|---|---|
| Custo | Free tier suficiente para ambiente académico/desenvolvimento |
| Rate limits | ~100 req/dia (free) — mitigável com cache e seed inicial |
| Autenticação | API Key via header `X-RapidAPI-Key` |
| Formato de dados | JSON REST |
| Privacidade | Apenas queries de pesquisa enviadas; sem dados pessoais do utilizador |

### Mitigação de riscos

* Popular BD local com exercícios no arranque da aplicação (seed)
* Servir exercícios da BD local em runtime; usar API apenas para atualizações

---

## 3. Google Gemini (gemini-2.0-flash)

### Valor acrescentado

Gera recomendações personalizadas (RF10) e resumos semanais (RF11) com base nos dados do utilizador. Substitui lógica de regras complexa por linguagem natural contextualizada e adaptada ao perfil individual.

### Fluxo de dados

```
WorkoutCompleted / MealLogged (evento RabbitMQ)
  → AI Recommendation Service recebe evento
  → Agrega dados: perfil + treinos recentes + refeições recentes + objetivos
  → Constrói prompt com métricas anónimas (sem PII)
  → Envia prompt para Gemini API
  → Persiste recomendação gerada na BD local
  → Publica evento RecommendationGenerated → Notification Service
```

### Riscos

| Risco | Detalhe |
|---|---|
| **Privacidade** ⚠️ | Dados de saúde (peso, dieta, treinos) enviados para servidores Google |
| Latência | Chamadas LLM = 1–5s; não adequado para fluxos síncronos |
| Qualidade das respostas | Output não determinístico; pode gerar recomendações imprecisas |
| Rate limits | Free tier: 15 req/min, 1500 req/dia (Google AI Studio) |
| Custo em produção | Gemini Flash é económico mas não gratuito em escala |

### Viabilidade

| Critério | Detalhe |
|---|---|
| Custo | Free tier via Google AI Studio suficiente para projeto académico |
| Rate limits | 15 RPM / 1500 RPD (free) — adequado para volume esperado |
| Autenticação | API Key via `Authorization: Bearer` |
| Formato de dados | JSON REST ou SDK oficial Google AI |
| Privacidade | Dados enviados sujeitos à política de privacidade Google; utilizadores devem ser informados |

### Mitigação de riscos

* Nunca incluir dados identificáveis no prompt (sem nome, email, ID direto)
* Enviar apenas métricas agregadas: `"média calórica: 1800kcal, meta: 2200kcal, treinos esta semana: 3"`
* Processamento sempre assíncrono via RabbitMQ — nunca bloquear request do utilizador

---

## 4. Mailtrap Email API

### Valor acrescentado

Envio de notificações por email (RF12) e resumos semanais (RF11) sem necessidade de gerir infraestrutura SMTP própria.

### Fluxo de dados

```
GoalReached / RecommendationGenerated (evento RabbitMQ)
  → Notification Service recebe evento
  → Constrói template de email com dados do evento
  → Chama Mailtrap API (POST /api/send)
  → Mailtrap entrega email ao utilizador
```

### Riscos

| Risco | Detalhe |
|---|---|
| Deliverability | Emails podem cair em spam se domínio não verificado |
| Dependência | Notificações bloqueadas se Mailtrap indisponível |
| Free tier limitado | 1000 emails/mês no free tier |

### Viabilidade

| Critério | Detalhe |
|---|---|
| Custo | Free tier: 1000 emails/mês — suficiente para projeto |
| Rate limits | 500 req/hora (free) |
| Autenticação | Bearer Token no header `Authorization` |
| Formato de dados | JSON REST |
| Privacidade | Endereços de email transmitidos a terceiro; deve constar em política de privacidade |

### Mitigação de riscos

* Configurar domínio de envio verificado no Mailtrap
* Falha no envio de email não deve propagar erro para o fluxo principal (fire-and-forget no Notification Service)

---

## 5. Resumo Comparativo

| Serviço consumidor | API Externa | Autenticação | Custo (dev) | Risco principal |
|---|---|---|---|---|
| Nutrition Service | Open Food Facts | Nenhuma | Gratuito | Dados incompletos |
| Workout Service | ExerciseDB | API Key | Gratuito (free tier) | Rate limit |
| AI Recommendation Service | Google Gemini | API Key (Bearer) | Gratuito (free tier) | Privacidade de dados de saúde |
| Notification Service | Mailtrap | Bearer Token | Gratuito (free tier) | Deliverability |

Todas as integrações são viáveis no free tier para o contexto académico do projeto.
