from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.services.email.base import EmailBackend, EmailMessage


class SMTPEmailBackend(EmailBackend):
    def __init__(
        self,
        host: str,
        port: int,
        username: str = "",
        password: str = "",
        use_tls: bool = False,
        from_addr: str = "no-reply@alma.com",
    ):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.use_tls = use_tls
        self.from_addr = from_addr

    def send(self, message: EmailMessage) -> None:
        from_addr = message.from_addr or self.from_addr
        msg = MIMEMultipart("alternative")
        msg["Subject"] = message.subject
        msg["From"] = from_addr
        msg["To"] = message.to

        msg.attach(MIMEText(message.text, "plain"))
        msg.attach(MIMEText(message.html, "html"))

        if self.use_tls:
            with smtplib.SMTP_SSL(self.host, self.port) as smtp:
                if self.username:
                    smtp.login(self.username, self.password)
                smtp.sendmail(from_addr, [message.to], msg.as_string())
        else:
            with smtplib.SMTP(self.host, self.port) as smtp:
                if self.username:
                    smtp.login(self.username, self.password)
                smtp.sendmail(from_addr, [message.to], msg.as_string())
