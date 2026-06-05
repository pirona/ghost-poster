# ghost-poster — Reverse proxy configuration

ghost-poster communicates exclusively with the Ghost Admin API (`/ghost/api/admin/`). If your Ghost instance sits behind a reverse proxy with access control, you need to ensure that path is reachable from mobile clients — not just from your local network.

---

## The core problem

A common pattern for self-hosted Ghost is to restrict the admin panel path to trusted IPs:

```haproxy
# Blocks everything under /ghost/ — including the API
acl ghost_path path_beg /ghost/
http-request deny if ghost_path !is_whitelisted
```

This blocks ghost-poster when used over mobile data, because `/ghost/api/admin/` starts with `/ghost/`.

**The fix:** split the restriction so that only the admin panel UI is IP-restricted, not the API. The API is already protected by Ghost's own JWT authentication — the proxy does not need to be a second barrier.

---

## HAProxy

### Separating admin UI from API

Replace the blanket `/ghost/` deny with an exception for `/ghost/api/`:

```haproxy
backend my-ghost-backend
    acl ghost_admin_path path_beg /ghost/
    acl ghost_api_path   path_beg /ghost/api/

    # Block admin panel UI from untrusted IPs, but let the API through
    http-request deny if ghost_admin_path !ghost_api_path !is_whitelisted

    server ghost 127.0.0.1:2368 check
```

Where `is_whitelisted` is your existing ACL for trusted IPs/networks. Result:

| Path | Trusted IP | Untrusted IP |
|---|---|---|
| `/ghost/` (admin panel) | ✅ allowed | 🚫 denied |
| `/ghost/api/admin/posts/` | ✅ allowed | ✅ allowed (JWT-protected) |
| `/ghost/api/admin/images/upload/` | ✅ allowed | ✅ allowed (JWT-protected) |

### Rate limiting note

If you apply rate limiting at the frontend level, make sure the rate-limit rule fires **after** the `http-request allow` rules for whitelisted sources — otherwise your own IP gets throttled too.

```haproxy
frontend https
    # ...
    acl my_ip src 1.2.3.4/32
    acl my_lan src 192.168.1.0/24

    http-request allow if my_ip
    http-request allow if my_lan
    http-request deny deny_status 429 if { sc0_http_req_rate gt 100 }
```

---

## Nginx

```nginx
server {
    listen 443 ssl;
    server_name ghost.example.com;

    # Block admin panel UI from outside
    location /ghost/ {
        # Allow the API through unconditionally
        location /ghost/api/ {
            proxy_pass http://127.0.0.1:2368;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Restrict admin panel UI to trusted IPs
        allow 192.168.1.0/24;
        allow 1.2.3.4;        # your fixed IP
        deny all;

        proxy_pass http://127.0.0.1:2368;
    }

    # Everything else passes through normally
    location / {
        proxy_pass http://127.0.0.1:2368;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Caddy

```caddy
ghost.example.com {
    # Block admin panel UI from outside, but let the API through
    @ghost_admin {
        path /ghost/*
        not path /ghost/api/*
        not remote_ip 192.168.1.0/24 1.2.3.4/32
    }
    respond @ghost_admin 403

    reverse_proxy localhost:2368
}
```

---

## Remote / offsite reverse proxy

If your Ghost instance runs at home on a dynamic IP, a common pattern is to put a VPS in front as a stable public entry point. Traffic flows:

```
[Mobile client]
      │ HTTPS :443
      ▼
[VPS — public IP, stable]
      │ WireGuard tunnel
      ▼
[Home HAProxy — TLS termination]
      │
      ▼
[Ghost :2368]
```

### Why this matters for IP-based ACLs

Without additional configuration, the home HAProxy sees the VPS WireGuard IP as the source for all requests — your `src`-based ACLs break. The solution is the **PROXY protocol**: the VPS forwards the real client IP alongside the TCP connection, and the home HAProxy reads it back.

### VPS HAProxy (TCP passthrough)

The VPS does not terminate TLS. It passes the raw TCP stream through to the home HAProxy, which keeps doing TLS termination as before.

```haproxy
frontend public_https
    bind *:443
    mode tcp
    option tcplog
    default_backend home_haproxy

backend home_haproxy
    mode tcp
    # send-proxy-v2 forwards the real client IP via PROXY protocol
    server home <wireguard_home_ip>:443 send-proxy-v2

frontend public_gitea_ssh
    bind *:2222
    mode tcp
    option tcplog
    default_backend home_gitea_ssh

backend home_gitea_ssh
    mode tcp
    server home <wireguard_home_ip>:2222 send-proxy-v2
```

Replace `<wireguard_home_ip>` with the WireGuard tunnel IP of your home machine (e.g. `10.0.0.1`).

### Home HAProxy adjustments

Accept the PROXY protocol on the HTTPS bind, and optionally restrict it to the VPS tunnel IP only:

```haproxy
frontend https
    # accept-proxy: read real client IP from the PROXY protocol header
    bind *:443 ssl crt /etc/haproxy/ssl/ strict-sni alpn h2,http/1.1 accept-proxy

    # Optional: only accept PROXY protocol from the VPS tunnel IP
    # bind *:443 ssl crt /etc/haproxy/ssl/ accept-proxy
    # tcp-request connection reject unless { src <wireguard_vps_ip> }

    # src ACLs now see the real client IP, not the VPS tunnel IP
    acl my_ip  src 1.2.3.4/32          # your fixed IP, unchanged
    acl my_lan src 192.168.1.0/24       # LAN, unchanged
    # ...
```

For SSH (Gitea), the `gitea-ssh` frontend should also accept PROXY protocol if you forward SSH through the VPS:

```haproxy
frontend gitea-ssh
    bind *:2222 accept-proxy
    mode tcp
    option tcplog
    default_backend gitea-ssh-backend
```

### WireGuard (minimal setup)

On the VPS (`/etc/wireguard/wg0.conf`):
```ini
[Interface]
Address = 10.0.0.2/24
PrivateKey = <vps_private_key>
ListenPort = 51820

[Peer]
PublicKey = <home_public_key>
AllowedIPs = 10.0.0.1/32
```

On the home server:
```ini
[Interface]
Address = 10.0.0.1/24
PrivateKey = <home_private_key>

[Peer]
PublicKey = <vps_public_key>
Endpoint = <vps_public_ip>:51820
AllowedIPs = 10.0.0.2/32
PersistentKeepalive = 25
```

`PersistentKeepalive` is important if the home server is behind NAT — it keeps the tunnel alive through the NAT mapping.

### DNS

Point your domain's A record to the VPS public IP. The home IP is never exposed.

---

## Security considerations

- The Ghost Admin API (`/ghost/api/admin/`) validates every request with a JWT derived from the Admin API key. A request with a missing or invalid JWT gets a 401 from Ghost directly — HAProxy does not need to be a second authentication layer on that path.
- Restricting `/ghost/` (the panel UI) to trusted IPs is still a useful defense-in-depth measure — it prevents brute-force attempts on the Ghost login form.
- If using the remote proxy pattern, make sure the home HAProxy only accepts PROXY protocol connections from the VPS tunnel IP — otherwise any host could spoof the source IP by sending crafted PROXY protocol headers.
- API keys are stored in the Android Keystore and never logged — see [SECURITY.md](SECURITY.md) for the full threat model.
