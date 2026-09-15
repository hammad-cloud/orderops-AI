"""Email / SMS outreach for negotiation offers."""


class NotificationService:
    async def send_email(self, to: str, subject: str, body: str) -> None:
        raise NotImplementedError

    async def send_sms(self, to: str, message: str) -> None:
        raise NotImplementedError
