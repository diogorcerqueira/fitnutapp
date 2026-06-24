import json
import re
from openai import OpenAI, RateLimitError, NotFoundError, APIStatusError
from app.config import settings

_client = OpenAI(
    api_key=settings.openrouter_api_key,
    base_url="https://openrouter.ai/api/v1",
)
_MODEL = settings.llm_model

GOAL_LABELS = {
    "lose_weight": "perda de peso",
    "maintain_weight": "manutenção de peso",
    "gain_muscle": "ganho de massa muscular",
}


def _call_llm(prompt: str) -> str:
    response = _client.chat.completions.create(
        model=_MODEL,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.choices[0].message.content


def _extract_json(text: str) -> dict:
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON found in response: {text[:200]}")
    return json.loads(match.group())


def generate_recommendation(user_snapshot, workout_count: int, avg_calories: float,
                             avg_protein: float, calorie_goal: int | None, protein_goal: int | None) -> dict:
    if user_snapshot:
        goal_label = GOAL_LABELS.get(user_snapshot.goal or "", "sem objetivo definido")
        profile_section = f"""Utilizador com objetivo: {goal_label}
Peso atual: {user_snapshot.weight_kg or "desconhecido"} kg | Altura: {user_snapshot.height_cm or "desconhecida"} cm | Idade: {user_snapshot.age or "desconhecida"} anos"""
        equipment_section = f"\nEquipamento disponível: {user_snapshot.available_equipment}" if user_snapshot.available_equipment else ""
    else:
        profile_section = "Perfil do utilizador não disponível."
        equipment_section = ""

    cal_meta = f" (meta: {calorie_goal} kcal)" if calorie_goal else ""
    prot_meta = f" (meta: {protein_goal}g)" if protein_goal else ""

    prompt = f"""{profile_section}{equipment_section}

Última semana:
- Treinos realizados: {workout_count}
- Média calórica diária: {avg_calories:.0f} kcal{cal_meta}
- Média proteica diária: {avg_protein:.0f}g{prot_meta}

Gera uma recomendação curta (máx. 3 frases) em português europeu,
focada no dado mais relevante para o objetivo do utilizador.
Se o equipamento disponível for relevante, inclui sugestões adaptadas a esse equipamento.
Responde APENAS em JSON: {{ "recommendation": "...", "focus_area": "nutrition|workout|recovery" }}"""

    return _extract_json(_call_llm(prompt))


def evaluate_workout_plan(user_snapshot, plan_data: dict) -> dict:
    goal_label = GOAL_LABELS.get(getattr(user_snapshot, "goal", None) or "", "sem objetivo definido")

    exercises_text = "\n".join([
        f"- {e['name']} ({e['muscleGroup']}): {e['sets']} séries × {e['reps']} repetições"
        + (f" | peso alvo: {e['targetWeightKg']}kg" if e.get('targetWeightKg') else "")
        for e in plan_data.get("exercises", [])
    ])

    profile_info = ""
    if user_snapshot:
        profile_info = f"""Utilizador com objetivo: {goal_label}
Peso: {user_snapshot.weight_kg or '?'}kg | Altura: {user_snapshot.height_cm or '?'}cm | Idade: {user_snapshot.age or '?'} anos
"""

    plan_name = plan_data.get('name', 'Sem nome')
    muscle_groups = list(dict.fromkeys(e['muscleGroup'] for e in plan_data.get('exercises', []) if e.get('muscleGroup')))
    muscle_context = f"Grupos musculares trabalhados: {', '.join(muscle_groups)}." if muscle_groups else ""

    prompt = f"""{profile_info}Plano de treino: "{plan_name}"
{muscle_context}
Exercícios:
{exercises_text}

O nome do plano indica a intenção do treino (ex: "Push Day", "Pernas", "Full Body").
Usa o nome e os grupos musculares para avaliar se os exercícios são coerentes com o foco pretendido.
Avalia em português europeu e responde APENAS em JSON:
{{
  "general_assessment": "apreciação geral do plano (coerência com o nome, equilíbrio muscular, volume, intensidade)",
  "suggestions": ["sugestão 1", "sugestão 2"],
  "goal_adequacy": "adequação ao objetivo do utilizador"
}}"""

    return _extract_json(_call_llm(prompt))


def generate_weekly_summary(user_snapshot, workout_count: int, avg_calories: float,
                             avg_protein: float, recommendations: list[str]) -> dict:
    goal_label = GOAL_LABELS.get(getattr(user_snapshot, "goal", None) or "", "sem objetivo definido")

    prompt = f"""Gera um resumo semanal em português europeu para um utilizador com objetivo: {goal_label}.

Dados da semana:
- Treinos realizados: {workout_count}
- Média calórica diária: {avg_calories:.0f} kcal
- Média proteica diária: {avg_protein:.0f}g
- Peso mais recente: {getattr(user_snapshot, 'weight_kg', None) or 'desconhecido'} kg

Responde APENAS em JSON:
{{
  "workouts_count": {workout_count},
  "avg_daily_calories": {avg_calories:.0f},
  "latest_weight_kg": {getattr(user_snapshot, 'weight_kg', None) or 'null'},
  "recommendations": ["recomendação 1", "recomendação 2", "recomendação 3"]
}}"""

    return _extract_json(_call_llm(prompt))
