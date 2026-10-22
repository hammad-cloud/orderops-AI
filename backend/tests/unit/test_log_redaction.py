"""Secrets and personal data never reach the logs."""

import logging

from app.core.log_redaction import install, redact_text


def test_masks_tokens_passwords_and_emails() -> None:
    token = "eyJzdWIiOiAxLCAidmVyIjogMH0=." + "a" * 64
    line = f"Authorization: Bearer {token} password=hunter2 {{\"token\": \"{token}\"}} user ava@example.com"
    out = redact_text(line)
    assert token not in out
    assert "hunter2" not in out
    assert "ava@" not in out
    assert "***@example.com" in out


def test_applies_to_every_logger_and_traceback(caplog) -> None:
    install()
    with caplog.at_level(logging.INFO):
        logging.getLogger("any.library").info("login for %s with password=%s", "mia@example.com", "s3cret")
        try:
            raise ValueError("duplicate key email=(zoe@example.com) password_hash=scrypt$abc")
        except ValueError:
            logging.getLogger("app").exception("insert failed")
    text = caplog.text + "".join(r.exc_text or "" for r in caplog.records)
    assert "mia@" not in text and "s3cret" not in text and "zoe@" not in text


def test_keeps_structured_args_that_formatters_unpack() -> None:
    """uvicorn's access log unpacks record.args as a 5-tuple; redaction must keep that shape."""
    install()
    record = logging.getLogger("uvicorn.access").makeRecord(
        "uvicorn.access", logging.INFO, __file__, 1, '%s - "%s %s HTTP/%s" %d',
        ("127.0.0.1:5000", "GET", "/api/v1/audit-trail?actor=ava@example.com", "1.1", 200), None,
    )
    client, method, path, version, status = record.args
    assert (method, status) == ("GET", 200)
    assert path == "/api/v1/audit-trail?actor=***@example.com"
