# 1. Objetivo do Sistema

O sistema permite aos utilizadores:

* Registar treinos
* Registar alimentação
* Definir objetivos físicos
* Acompanhar progresso
* Receber recomendações geradas por IA
* Receber notificações automáticas

---

# 2. Stakeholders

### Utilizador

Pessoa que pretende acompanhar a sua evolução física.

### Administrador

Responsável pela gestão da plataforma.

### Sistemas Externos

| Sistema | Utilização | Serviço consumidor |
|---|---|---|
| Google Gemini (gemini-2.0-flash) | Geração de recomendações e resumos por IA | AI Recommendation Service |
| Open Food Facts | Dados nutricionais (calorias, macros) | Nutrition Service |
| ExerciseDB (RapidAPI) | Catálogo de exercícios | Workout Service |
| Mailtrap Email API | Envio de notificações por email | Notification Service |

---

# 3. Requisitos Funcionais

## RF01 – Registo de Utilizador

O sistema deve permitir o registo de novos utilizadores.

### Critérios

* Nome
* Email
* Password

---

## RF02 – Autenticação

O sistema deve suportar dois métodos de autenticação, ambos resultando na emissão de um JWT.

### Método 1 – Credenciais próprias

* Registo com email + password
* Login por email e password
* Logout (invalidação do token)

### Método 2 – Google OAuth 2.0

* Login via conta Google ("Login com Google")
* Fluxo OAuth 2.0: redirect → Google consent → callback → JWT emitido pelo Auth Service
* Se conta Google não tiver registo prévio, utilizador criado automaticamente

### Token

* JWT emitido pelo Auth Service após autenticação (qualquer método)
* Todos os outros serviços validam o JWT recebido (sem chamar o Auth Service em cada request)

---

## RF03 – Gestão de Perfil

O utilizador deve poder gerir o seu perfil físico.

### Dados editáveis

* Peso atual
* Altura
* Idade
* Objetivo geral (perder peso / manter peso / ganhar massa muscular)

---

## RF04 – Consulta de Exercícios

O sistema deve disponibilizar um catálogo de exercícios proveniente da ExerciseDB API.

### Informação por exercício

* Nome
* Grupo muscular
* Equipamento necessário
* Descrição

### Critério

* O catálogo deve ser pesquisável por nome, grupo muscular e equipamento

---

## RF05 – Registo de Treino Realizado

O utilizador deve poder registar treinos já executados.

### Dados por treino

* Data de execução
* Exercícios realizados
* Séries, repetições e peso utilizado por exercício

> Treinos registados aqui disparam o evento `WorkoutCompleted`.

---

## RF16 – Planeamento de Treino

O utilizador deve poder criar treinos em estado de rascunho, antes de os executar.

### Dados por plano

* Nome do plano (ex: "Treino A – Peito e Tríceps")
* Exercícios selecionados do catálogo (RF04)
* Séries e repetições planeadas por exercício
* Peso alvo por exercício (opcional)

### Estados

| Estado | Descrição |
|---|---|
| `draft` | Em construção, não executado |
| `ready` | Avaliado pela IA (RF17) |
| `completed` | Executado e registado como treino realizado (RF05) |

---

## RF17 – Avaliação de Treino por IA

O utilizador deve poder solicitar uma avaliação por IA de um treino planeado (RF16).

### Fluxo

1. Utilizador submete pedido de avaliação sobre um plano em estado `draft`
2. Workout Service chama AI Recommendation Service via REST síncrono
3. AI Service constrói prompt com: plano de treino + perfil do utilizador + objetivos
4. Gemini avalia o plano e devolve resposta estruturada
5. Utilizador recebe avaliação e pode aceitar sugestões ou ignorar

### Conteúdo da avaliação

* Apreciação geral do plano (equilíbrio muscular, volume, intensidade)
* Sugestões de ajuste (ex: substituição de exercícios, alteração de séries)
* Adequação ao objetivo do utilizador (ex: perda de peso vs. ganho muscular)

### Critérios

* Pedido síncrono — utilizador aguarda resposta (latência esperada: 2–5s)
* Avaliação guardada no plano; estado passa a `ready`
* Utilizador pode solicitar nova avaliação após modificar o plano

---

## RF06 – Consulta de Histórico de Treinos

O utilizador deve poder consultar o histórico de treinos.

### Conteúdo

* Lista de treinos anteriores com data
* Volume total por sessão (séries × repetições × peso)
* Evolução de carga por exercício ao longo do tempo

---

## RF07 – Registo Alimentar

O utilizador deve poder registar alimentos consumidos, organizados por tipo de refeição.

### Tipos de refeição

* Pequeno-almoço
* Almoço
* Lanche
* Jantar

### Dados por entrada alimentar

* Tipo de refeição
* Alimento (pesquisado via Open Food Facts)
* Quantidade (gramas)
* Data (dia — sem hora)

---

## RF08 – Consulta Nutricional

O sistema deve apresentar os macronutrientes agregados por dia.

### Dados apresentados

* Calorias totais
* Proteínas (g)
* Hidratos de carbono (g)
* Gorduras (g)

### Origem dos dados

Open Food Facts API (com cache local).

---

## RF09 – Definição de Objetivos

O utilizador deve poder definir metas quantitativas, geridas pelo Auth Service.

### Metas configuráveis

* Peso alvo (kg)
* Meta calórica diária (kcal)
* Meta proteica diária (g)

### Exemplo

```text
Peso atual: 90kg → Peso objetivo: 80kg
Meta calórica: 2200 kcal/dia
Meta proteica: 140g/dia
```

---

## RF10 – Recomendações por IA

O sistema deve gerar recomendações personalizadas com base nos dados do utilizador, via Google Gemini.

### Gatilho

Após registo de treino ou refeição (assíncrono).

### Exemplo de output

```text
A sua ingestão proteica está abaixo da meta.
Considere adicionar uma refeição rica em proteína.
```

---

## RF11 – Resumo Semanal

O sistema deve gerar automaticamente um resumo semanal, enviado por email.

### Mecanismo

Job agendado (cron) no AI Recommendation Service, executado semanalmente.

### Conteúdo

* Treinos realizados na semana
* Média calórica diária
* Peso registado mais recente
* Recomendações da semana

---

## RF12 – Notificações por Email

O sistema deve enviar notificações via Mailtrap quando:

* Objetivos forem atingidos (`GoalReached`)
* Existirem novas recomendações (`RecommendationGenerated`)
* Resumo semanal for gerado

---

# 4. Requisitos Não Funcionais

## RNF01 – Arquitetura

O sistema deve ser implementado em 5 microserviços independentes.

---

## RNF02 – Separação de Camadas

Cada microserviço deve conter:

```text
Presentation  → Controllers / API endpoints
Application   → Use Cases / Application Services
Domain        → Entidades + Domain Services
Infrastructure → Repositórios + Migrações + Clientes externos
```

---

## RNF03 – Comunicação

### Síncrona

REST APIs com versionamento `/api/v1/...`.

### Assíncrona

RabbitMQ para comunicação orientada a eventos entre serviços.

---

## RNF04 – Segurança

* Autenticação via JWT (todos os endpoints protegidos exceto login/registo)
* Passwords cifradas com hashing (bcrypt ou equivalente)
* API Keys de serviços externos armazenadas em variáveis de ambiente

---

## RNF05 – Independência dos Serviços

Cada serviço deve:

* Ter a sua própria base de dados (padrão *Database per Service*)
* Poder ser executado e deployado independentemente
* Não partilhar código de domínio com outros serviços

---

## RNF06 – Documentação de APIs

Swagger/OpenAPI obrigatório e publicado para cada microserviço.

---

## RNF07 – Tecnologia de Base de Dados

* **Motor**: PostgreSQL
* **Padrão**: cada microserviço usa um schema PostgreSQL dedicado (isolamento lógico numa única instância local)

---

# 5. Integrações Externas

## Open Food Facts

| Critério | Detalhe |
|---|---|
| Valor | Fornece macronutrientes sem construir catálogo próprio |
| Autenticação | Nenhuma (dados abertos) |
| Custo | Gratuito |
| Rate limits | Sem limite oficial; uso responsável requerido |
| Formato | JSON REST |
| Risco principal | Dados incompletos para alimentos regionais |
| Mitigação | Cache local + fallback para input manual de macros |
| Privacidade | Sem dados do utilizador enviados |

---

## ExerciseDB (RapidAPI)

| Critério | Detalhe |
|---|---|
| Valor | Catálogo de exercícios com grupo muscular e equipamento |
| Autenticação | API Key via header `X-RapidAPI-Key` |
| Custo | Free tier (~100 req/dia) suficiente para desenvolvimento |
| Rate limits | ~100 req/dia (free) |
| Formato | JSON REST |
| Risco principal | Limite de requests atingido em uso intensivo |
| Mitigação | Seed da BD local no arranque; servir da BD em runtime |
| Privacidade | Sem dados do utilizador enviados |

---

## Google Gemini (gemini-2.0-flash)

| Critério | Detalhe |
|---|---|
| Valor | Gera recomendações e resumos personalizados em linguagem natural |
| Autenticação | API Key via `Authorization: Bearer` |
| Custo | Free tier (Google AI Studio): 15 req/min, 1500 req/dia |
| Rate limits | 15 RPM / 1500 RPD (free) — adequado para projeto |
| Formato | JSON REST |
| Risco principal | Dados de saúde enviados para servidores Google |
| Mitigação | Enviar apenas métricas agregadas anónimas (sem nome/email); processamento sempre assíncrono |
| Privacidade | Utilizadores devem ser informados na política de privacidade |

---

## Mailtrap Email API

| Critério | Detalhe |
|---|---|
| Valor | Envio de emails transacionais e notificações sem infraestrutura SMTP |
| Autenticação | Bearer Token no header `Authorization` |
| Custo | Free tier: 1000 emails/mês — suficiente para projeto |
| Rate limits | 500 req/hora (free) |
| Formato | JSON REST |
| Risco principal | Emails em spam se domínio não verificado |
| Mitigação | Configurar domínio de envio; usar templates HTML simples |
| Privacidade | Endereços de email transmitidos a terceiro; constar na política de privacidade |

---

# 6. Eventos de Domínio

Eventos publicados via RabbitMQ que justificam a comunicação assíncrona.

| Evento | Publicado por | Consumido por | Razão para async |
|---|---|---|---|
| `UserRegistered` | Auth Service | Notification Service | Email de boas-vindas não bloqueia registo |
| `WorkoutCompleted` | Workout Service | AI Recommendation Service | Geração de IA é lenta; não deve bloquear o utilizador |
| `MealLogged` | Nutrition Service | AI Recommendation Service | Idem |
| `GoalReached` | Auth Service | Notification Service | Notificação não é crítica para o fluxo principal |
| `RecommendationGenerated` | AI Recommendation Service | Notification Service | Entrega de email independente do cálculo |

### Consistência

Modelo de **consistência eventual**: cada serviço processa eventos de forma idempotente. Em caso de falha, RabbitMQ mantém a mensagem na fila para reprocessamento.

---

# 7. Microserviços

## Auth Service

Responsável por:

* Registo e login por email + password (RF01, RF02)
* Fluxo Google OAuth 2.0 (RF02)
* Emissão de JWT após autenticação (qualquer método)
* Gestão de perfil físico (RF03)
* Definição e gestão de objetivos (RF09)

---

## Workout Service

Responsável por:

* Catálogo de exercícios via ExerciseDB (RF04)
* Planeamento de treinos em rascunho (RF16)
* Registo de treinos executados (RF05)
* Histórico e evolução de treinos (RF06)
* Pedido de avaliação de plano ao AI Recommendation Service via REST síncrono (RF17)

---

## Nutrition Service

Responsável por:

* Pesquisa de alimentos via Open Food Facts (RF07, RF08)
* Registo de refeições diárias
* Cálculo de macronutrientes diários

---

## AI Recommendation Service

Responsável por:

* Geração de recomendações personalizadas via Google Gemini (RF10)
* Geração de resumos semanais agendados (RF11)
* Avaliação on-demand de planos de treino (RF17) — chamado via REST síncrono pelo Workout Service

Integra: `gemini-2.0-flash` via Google AI Studio API.

### Tipos de chamada

| Tipo | Origem | Mecanismo |
|---|---|---|
| Recomendação pós-treino/refeição | Workout / Nutrition Service | Async (RabbitMQ) |
| Avaliação de plano de treino | Workout Service | Sync (REST) |
| Resumo semanal | Cron interno | Scheduled job |

---

## Notification Service

Responsável por:

* Envio de emails via Mailtrap (RF12)
* Consumo de eventos de domínio: `UserRegistered`, `GoalReached`, `RecommendationGenerated`
