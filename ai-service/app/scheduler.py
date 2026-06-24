from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

_scheduler = AsyncIOScheduler()


def start_scheduler():
    from app.application.use_cases.generate_weekly_summary import generate_weekly_summaries
    _scheduler.add_job(
        generate_weekly_summaries,
        trigger=CronTrigger(day_of_week="mon", hour=8, minute=0),
        id="weekly-summary",
        replace_existing=True,
    )
    _scheduler.start()
    print("[Scheduler] Weekly summary scheduled: Monday 08:00 UTC")


def stop_scheduler():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
