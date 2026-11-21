from datetime import date, timedelta

from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.models import AlertLog, StockBatch
from app.services.whatsapp import send_whatsapp_message


def check_expiring_batches():
    """Runs daily. Marks expired batches, flags batches expiring within 10 days, alerts the owner."""
    db = SessionLocal()
    try:
        today = date.today()

        # 1) anything past its expiry date is no longer sellable
        expired = (
            db.query(StockBatch)
            .filter(StockBatch.expiry_date < today, StockBatch.status.in_(["active", "expiring_soon"]))
            .all()
        )
        for batch in expired:
            batch.status = "expired"

        # 2) anything expiring within 10 days gets flagged + owner is told
        soon = (
            db.query(StockBatch)
            .filter(
                StockBatch.expiry_date >= today,
                StockBatch.expiry_date <= today + timedelta(days=10),
                StockBatch.status == "active",
            )
            .all()
        )
        for batch in soon:
            batch.status = "expiring_soon"
            message = (
                f"Alert: Batch #{batch.id} (Product {batch.product_id}) "
                f"expires on {batch.expiry_date}. Use it first (FEFO)."
            )
            sent = "skipped"
            if settings.OWNER_PHONE:
                try:
                    send_whatsapp_message(to_number=settings.OWNER_PHONE, body=message)
                    sent = "sent"
                except Exception as e:
                    print(f"Expiry alert failed: {e}")
                    sent = "failed"
            db.add(AlertLog(alert_type="expiry", related_id=batch.id, channel="whatsapp", status=sent))

        db.commit()
    finally:
        db.close()


scheduler = BackgroundScheduler()


def start_scheduler():
    # runs once every day at 08:00 server time
    scheduler.add_job(check_expiring_batches, "cron", hour=8, minute=0, id="expiry_check")
    scheduler.start()
