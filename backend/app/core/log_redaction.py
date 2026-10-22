"""Scrub secrets and personal data from every log message, whichever logger or handler writes it."""

import logging
import re

_FORMATTER = logging.Formatter()

_RULES = [
    # bearer tokens and our signed tokens (base64 payload "." 64-hex signature)
    (re.compile(r"(?i)\bbearer\s+[\w\-.~+/=]+"), "Bearer [REDACTED]"),
    (re.compile(r"\b[A-Za-z0-9_\-]{16,}={0,2}\.[0-9a-f]{64}\b"), "[REDACTED-TOKEN]"),
    # password / secret / token fields in key=value, key: value or JSON form
    (re.compile(r"""(?i)(["']?(?:password|passwd|secret(?:_key)?|token|authorization)["']?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,&}]+)"""),
     r"\1[REDACTED]"),
    # email addresses: keep the domain for troubleshooting, hide the person
    (re.compile(r"\b[A-Za-z0-9._%+\-]+@([A-Za-z0-9.\-]+\.[A-Za-z]{2,})\b"), r"***@\1"),
]


def redact_text(text: str) -> str:
    for pattern, replacement in _RULES:
        text = pattern.sub(replacement, text)
    return text


def install() -> None:
    """Wrap the log record factory once; formatted message and exception text are both scrubbed."""
    previous = logging.getLogRecordFactory()
    if getattr(previous, "_redacting", False):
        return

    def scrub(value):
        return redact_text(value) if isinstance(value, str) else value

    def factory(*args, **kwargs) -> logging.LogRecord:
        record = previous(*args, **kwargs)
        # scrub each argument in place first: formatters such as uvicorn's access log unpack record.args
        if isinstance(record.args, tuple):
            record.args = tuple(scrub(a) for a in record.args)
        elif isinstance(record.args, dict):
            record.args = {k: scrub(v) for k, v in record.args.items()}
        # a secret can still appear only once template and args meet ("password=%s"): then store the scrubbed text
        try:
            message = record.getMessage()
        except (TypeError, ValueError):  # malformed %-args: leave the record as it is rather than crash
            message = None
        if message is not None and redact_text(message) != message:
            record.msg, record.args = redact_text(message), ()
        # handlers reuse a pre-set exc_text, so tracebacks (e.g. SQL errors with parameters) are scrubbed too
        if record.exc_info:
            record.exc_text = redact_text(_FORMATTER.formatException(record.exc_info))
        if record.stack_info:
            record.stack_info = redact_text(record.stack_info)
        return record

    factory._redacting = True  # type: ignore[attr-defined]
    logging.setLogRecordFactory(factory)
