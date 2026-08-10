# Coolify deployment — YTŠkola Zitadel

Deploys this fork's Croatian login UI together with a stock upstream Zitadel API
and its own Postgres, behind Coolify's Traefik.

## What differs from production

Production lives at `/opt/zitadel` on `46.225.98.108` and runs
`docker-compose.yml` + `docker-compose.mode-letsencrypt.yml`. `coolify/docker-compose.yml`
is derived from those two with three changes:

1. **No TLS, no ACME.** Coolify's Traefik terminates TLS and forwards plain HTTP
   to this stack's inner proxy on its `web` entrypoint. Every `-websecure`
   router and `certresolver` label is dropped; the surviving `-web` routers keep
   prod's rules, priorities and the `h2c` scheme to the API verbatim.
2. **The login image is built here.** Production's `ytskola-login:v4.13.3-ytskola`
   only ever existed on the prod host, in no registry. The compose builds
   `apps/login/Dockerfile.build` from the repo root instead.
3. **`redis` and `otel-collector` are gone.** Both sit behind compose profiles
   that production does not enable.

The inner proxy is kept rather than folded into Coolify's Traefik. Coolify
stores generated labels as a base64 snapshot and replays them on every deploy,
and this routing depends on priority ordering (400 root → 250 login → 200 api →
100 catch-all) plus an h2c upgrade. Nesting leaves the proven rules alone. The
outer hop does not need h2c, because Connect-RPC works over HTTP/1.1.

The inner Traefik's docker provider is constrained to
``Label(`zitadel.stack`,`ytskola`)``. Without that it also matches the Traefik
labels Coolify injects into the proxy service itself and routes the host back
into the proxy.

## Environment variables

Set in Coolify, not in this repo. Values come from prod's `/opt/zitadel/.env`.

| Variable | Note |
|---|---|
| `ZITADEL_MASTERKEY` | **Must be byte-identical to prod** — 32 chars |
| `ZITADEL_DOMAIN` | the host this instance is served on |
| `ZITADEL_DATABASE_POSTGRES_DSN` | points at the `postgres` service |
| `POSTGRES_ADMIN_USER` / `POSTGRES_ADMIN_PASSWORD` / `POSTGRES_DB` | |
| `ZITADEL_VERSION` / `POSTGRES_IMAGE` / `TRAEFIK_IMAGE` | pinned tags |
| `ZITADEL_NETWORK` | compose network name, referenced by Traefik |
| `LOGIN_CLIENT_PAT_EXPIRATION`, `TRAEFIK_LOG_LEVEL`, `TRAEFIK_ACCESSLOG_ENABLED`, `ZITADEL_ACCESS_LOG_STDOUT_ENABLED` | |

The masterkey seals every encrypted column — IDP secrets, client secrets, SMTP
password, machine keys. Restoring a prod database under a different masterkey
yields an instance that boots and serves a working console while every secret
silently decrypts to garbage.

## Migrating data from production

Order matters. Deploy with an empty database first and confirm the stack is
healthy, so that plumbing failures are distinguishable from data failures.

```bash
# 1. dump prod (read-only; does not touch the running instance)
ssh root@46.225.98.108 'docker exec zitadel-postgres-1 \
  pg_dump -U postgres -d zitadel --clean --if-exists' > zitadel.sql

# 2. restore into the Coolify stack's postgres
cat zitadel.sql | ssh coolify 'docker exec -i <postgres-container> \
  psql -U postgres -d zitadel'

# 3. carry over the login client PAT -- see below
# 4. register the new host as an instance domain -- see below
```

### The login client PAT

`start-from-init` writes `/zitadel/bootstrap/login-client.pat` once, and the
login container reads it to authenticate against the API. Restoring an
already-initialised database makes init a no-op, so the PAT left in the volume
belongs to the throwaway instance created on first boot and is not present in
the restored data. The login UI then cannot reach the API while every container
still reports healthy.

Copy prod's file into the volume after restoring, then restart the login
container.

### Instance domains

Zitadel resolves the instance from the request `Host`. The restored database
only knows prod's domains, so requests to any other host fail to match an
instance. Register the new host in `projections.instance_domains` (or via the
System API) before testing.

## Verifying

```bash
ssh coolify 'docker ps --filter "label=coolify.applicationId=<id>" \
  --format "{{.Names}} :: {{.Status}}"'    # expect 4 services healthy
```

Then, from outside: `/` must serve the Croatian login page, `/ui/v2/login/login`
must render it too, and the console must load at `/ui/console`. A green
deployment means none of that on its own.
