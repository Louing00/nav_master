#!/usr/bin/env bash
set -euo pipefail

UPSTREAM="${UPSTREAM:-http://127.0.0.1:8081}"

if [ -z "${DOMAIN:-}" ]; then
  read -r -p "请输入要绑定的域名，例如 nav.example.com: " DOMAIN
fi

DOMAIN="$(echo "$DOMAIN" | xargs)"
if [ -z "$DOMAIN" ]; then
  echo "域名不能为空。"
  exit 1
fi

if [[ ! "$DOMAIN" =~ ^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$ ]]; then
  echo "域名格式不正确：$DOMAIN"
  exit 1
fi

CONF_PATH="/etc/nginx/sites-available/${DOMAIN}"
ENABLED_PATH="/etc/nginx/sites-enabled/${DOMAIN}"

if [ "$(id -u)" -ne 0 ]; then
  echo "请使用 root 或 sudo 执行。"
  exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
  apt-get update
  apt-get install -y nginx
fi

cat > "$CONF_PATH" <<EOF
server {
    listen 80;
    server_name ${DOMAIN};

    client_max_body_size 256m;

    location / {
        proxy_pass ${UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

ln -sf "$CONF_PATH" "$ENABLED_PATH"
nginx -t
systemctl enable nginx
systemctl reload nginx

if command -v certbot >/dev/null 2>&1; then
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@${DOMAIN#*.}" || true
  systemctl reload nginx
fi

echo "Nginx 已配置：http://${DOMAIN} -> ${UPSTREAM}"
