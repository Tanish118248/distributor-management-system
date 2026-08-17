from datetime import date, timedelta

from apscheduler.schedulers.background import BackgroundScheduler

from app.core.database import SessionLocal
from app.models.models import StockBatch, AlertLog
from app.services.whatsapp import send_whatsapp_message
from app.models.models import Customer  # only needed if you alert a specific customer/owner


def check_expiring_batches():
    """Runs daily. Flags batches within 10 days of expiry and logs/sends an alert."""
    db = SessionLocal()
    try:
        threshold_date = date.today() + timedelta(days=10)
        batches = (
            db.query(StockBatch)
            .filter(StockBatch.expiry_date <= threshold_date, StockBatch.status == "active")
            .all()
        )
        for batch in batches:
            batch.status = "expiring_soon"

            # Send an alert (to the distributor's own configured number)
            message = (
                f"Alert: Batch #{batch.id} (Product {batch.product_id}) "
                f"expires on {batch.expiry_date}. Use it first (FEFO)."
            )
            send_whatsapp_message(to_number="whatsapp:+91XXXXXXXXXX", body=message)

            db.add(AlertLog(alert_type="expiry", related_id=batch.id, channel="whatsapp", status="sent"))

        db.commit()
    finally:
        db.close()


scheduler = BackgroundScheduler()


def start_scheduler():
    # runs once every day at 08:00 server time
    scheduler.add_job(check_expiring_batches, "cron", hour=8, minute=0, id="expiry_check")
    scheduler.start()
