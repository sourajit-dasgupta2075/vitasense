from __future__ import annotations

from collections import Counter


def compute_dashboard_bundle(repo, user_id: int) -> dict:
    metrics = repo.list_metrics(user_id)
    symptoms = repo.list_symptoms(user_id)
    appointments = repo.list_appointments(user_id)
    goals = repo.list_goals(user_id)
    reminders = repo.list_reminders(user_id)
    journal_entries = repo.list_journal_entries(user_id)
    profile = repo.get_profile(user_id)

    latest_metric = metrics[0] if metrics else {}
    completed_goals = [goal for goal in goals if goal["status"] == "completed"]
    active_goals = [goal for goal in goals if goal["status"] != "completed"]
    upcoming_appointments = [item for item in appointments if item["status"] != "completed"]
    adherence = 0
    if reminders:
        taken_count = sum(1 for item in reminders if item["status"] == "taken")
        adherence = round((taken_count / len(reminders)) * 100)

    symptom_counter = Counter(item["category"] for item in symptoms)
    frequent_symptoms = [
        {"label": label, "count": count} for label, count in symptom_counter.most_common(4)
    ]

    insight_messages = []
    if latest_metric:
        sleep = latest_metric.get("sleep_hours") or 0
        hydration = latest_metric.get("hydration_liters") or 0
        mood = latest_metric.get("mood_score") or 0
        if sleep < 7:
            insight_messages.append("Sleep has been below 7 hours. Consider shifting reminders earlier.")
        if hydration < 2:
            insight_messages.append("Hydration is trending low. Add one more water reminder to your routine.")
        if mood <= 5:
            insight_messages.append("Mood scores are soft. A journal check-in may help identify patterns.")

    if not insight_messages:
        insight_messages.append("Your latest data looks steady. Keep tracking to preserve momentum.")

    return {
        "profile": profile,
        "overview": {
            "streak_days": min(len(metrics), 21),
            "active_goals": len(active_goals),
            "completed_goals": len(completed_goals),
            "upcoming_appointments": len(upcoming_appointments),
            "medication_adherence": adherence,
            "journal_entries": len(journal_entries),
        },
        "latest_metric": latest_metric,
        "metrics": metrics,
        "symptoms": symptoms,
        "appointments": appointments,
        "goals": goals,
        "reminders": reminders,
        "journal_entries": journal_entries,
        "frequent_symptoms": frequent_symptoms,
        "insights": insight_messages,
    }
