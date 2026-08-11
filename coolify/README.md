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

Not needed in practice. Zitadel resolved the restored instance from
`ZITADEL_EXTERNALDOMAIN` even though `projections.instance_domains` only listed
prod's hostnames, because there is a single instance. Worth rechecking if a
second instance is ever added.

### The login redirect points at production

This one does need fixing, and it is not obvious. The restored instance carries
its own LoginV2 base URI in `projections.instance_features5` under key
`login_v2`, holding `"Host": "auth.ytskola.com"`. The
`ZITADEL_DEFAULTINSTANCE_FEATURES_LOGINV2_BASEURI` variable does **not** override
it -- `DEFAULTINSTANCE` applies only to instances Zitadel creates itself, never
to a restored one. Until it is changed, opening the console on the clone
redirects the user to production to log in.

```sql
update projections.instance_features5
   set value = jsonb_set(value::jsonb, '{base_uri,Host}', '"<new host>"'::jsonb)::text::jsonb
 where key = 'login_v2';
```

Restart the API afterwards; it caches instance features in memory.

This is a projection-level edit, so a projection rebuild (a Zitadel version
upgrade, say) reverts it to the value in the eventstore. At the cutover to
`auth.ytskola.com` the stored value becomes correct again and the edit stops
mattering.

## Deployed instance

| | |
|---|---|
| Coolify application | `ytskola-zitadel`, uuid `mlty8kfc4j7dgydekfegin3k`, numeric id `9` |
| URL | https://auth.ytskola.com |

This is production as of 2026-08-11. The old stack at `46.225.98.108:/opt/zitadel`
is **stopped, not removed** — its `zitadel_postgres-data`,
`zitadel_zitadel-bootstrap` and `zitadel_letsencrypt` volumes are intact.

Rollback is: point the `auth.ytskola.com` A record back to `46.225.98.108` and
`docker start zitadel-postgres-1 zitadel-proxy-1 zitadel-zitadel-api-1 zitadel-zitadel-login-1`.
That loses every event recorded on Coolify after the cutover, since the two
databases diverge from the moment traffic moved.

Note that the old host's `ytskola-kurs` containers were routed by the Zitadel
Traefik (router `kurs`, `Host(izazov.ytskola.com)`) and are now unrouted there.
Nothing points at them — `izazov.ytskola.com` resolves to the Coolify host and is
served by Coolify application `tmsl0nrzt6ivyqj93jvlsl57`.

### Changing the domain again

Four things, and only one of them is DNS:

1. The A record.
2. `docker_compose_domains` — **replace**, never add a second entry. Coolify names
   the routers `http-0-<uuid>-proxy`; the `0` is the domain slot, and the
   `traefik.http.services.zitadel-entry` label this compose supplies is bound to
   slot 0. A second domain creates slot-1 routers with no service behind them,
   which 404s silently.
3. The `ZITADEL_DOMAIN` env var, followed by a **redeploy** — it is a compose
   interpolation, so a restart will not pick it up.
4. The `login_v2` row in `projections.instance_features5`, then an API restart.

Set the Coolify domain *after* the A record has moved. ACME uses HTTP-01, so the
certificate cannot be issued until DNS already points at the Coolify host; doing
it in the other order puts Traefik into a retry backoff of minutes.

Nothing needs to change in Supabase, and no OIDC client needs re-trusting: the
database carries the same signing keys, so the JWKS `kid`s are unchanged.

## Verifying

```bash
APPID=9
ssh coolify "docker ps --filter 'label=coolify.applicationId=$APPID' \
  --format '{{.Names}} :: {{.Status}}'"     # expect 4 services, all healthy
```

All four must be healthy, the proxy included. Traefik **skips containers marked
unhealthy**, so an unhealthy proxy publishes no router at all and every request
falls through to Coolify's 503 catch-all -- with nothing logged to explain it.

```bash
U=https://mlty8kfc4j7dgydekfegin3k.app.bigburg.net
curl -s -o /dev/null -w '%{http_code}\n' $U/                                 # 200, Croatian login
curl -s -o /dev/null -w '%{http_code}\n' $U/ui/console                       # 200
curl -s $U/.well-known/openid-configuration | jq -r .issuer                  # must be this host
curl -s $U/oauth/v2/keys | jq '.keys | length'                               # >0 proves the masterkey
```

`/oauth/v2/keys` is the check that matters after a restore: returning keys means
Zitadel decrypted the signing keys, which only succeeds with the correct
masterkey. Everything else here passes with a wrong one.

A green deployment implies none of the above.
