# Security

## Reporting a vulnerability

Please don't open a public issue. Report it privately through GitHub's
**Security → Report a vulnerability** on this repository, with steps to reproduce.

## Deployment checklist

- `SECRET_KEY` — random, 32+ characters (the API refuses to start with the example value).
  Generate one with `python -c "import secrets; print(secrets.token_urlsafe(48))"`.
- `ADMIN_PASSWORD` — strong and unique; login is disabled while it is empty.
- `DATABASE_URL` — never use the example `postgres:postgres` credentials outside local development.
- Serve the frontend over HTTPS so the session cookie is sent with the `Secure` flag.
- Only `.env.example` files belong in git; real `.env` files are ignored.
