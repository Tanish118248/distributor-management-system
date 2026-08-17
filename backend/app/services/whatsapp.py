from twilio.rest import Client

from app.core.config import settings

client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

ORDER_CONFIRMATION_CONTENT_SID = "HXd32f5a29b1595a0e45429361520534ca"


def send_whatsapp_message(to_number: str, body: str = None, content_sid: str = None, content_variables: str = None):
    """
    to_number must be in the form 'whatsapp:+91XXXXXXXXXX'
    Use content_sid + content_variables for approved templates (required for
    proactive/outbound messages). Use body for plain text (works for replies
    within an active session, but may fail otherwise per Twilio's messaging policy).
    """
    if content_sid:
        message = client.messages.create(
            from_=settings.TWILIO_WHATSAPP_NUMBER,
            to=to_number,
            content_sid=content_sid,
            content_variables=content_variables,
        )
    else:
        message = client.messages.create(
            from_=settings.TWILIO_WHATSAPP_NUMBER,
            to=to_number,
            body=body,
        )
    return message.sid