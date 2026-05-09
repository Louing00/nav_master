#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/atlasgate}"
REPO_URL="${REPO_URL:-https://github.com/Louing00/nav_master.git}"
BRANCH="${BRANCH:-main}"

ensure_docker() {
  if command -v docker >/dev/null 2>&1 && { docker compose version >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1; }; then
    return
  fi

  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
}

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose "$@"
  else
    docker-compose "$@"
  fi
}

ensure_repo() {
  if [ -d "$APP_DIR/.git" ]; then
    git -C "$APP_DIR" fetch origin "$BRANCH"
    git -C "$APP_DIR" checkout "$BRANCH"
    git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
  else
    mkdir -p "$(dirname "$APP_DIR")"
    git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
  fi
}

ensure_env() {
  cd "$APP_DIR"
  if [ ! -f .env ]; then
    JWT_SECRET="$(openssl rand -hex 32)"
    ADMIN_PASSWORD="$(openssl rand -base64 18 | tr -d '=+/')"
    cat > .env <<EOF
NODE_ENV=production
APP_PORT=8081
DATABASE_URL=file:/data/nav.db
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$ADMIN_PASSWORD
COOKIE_SECURE=false
EOF
    echo "初始管理员账号：admin"
    echo "初始管理员密码：$ADMIN_PASSWORD"
    echo "请保存该密码。"
  fi
}

main() {
  ensure_docker
  ensure_repo
  ensure_env
  mkdir -p "$APP_DIR/data"
  cd "$APP_DIR"
  compose up -d --build
  compose ps
  echo "AtlasGate 已启动：http://服务器IP:8081"
}

main "$@"
