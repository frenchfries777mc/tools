#!/bin/bash
# Run on the Oracle server (ubuntu): bash install.sh   -> Fry Store on https://140-238-55-153.sslip.io
set -e
sudo mkdir -p /opt/fry-store /var/lib/fry-store
sudo cp "$(dirname "$0")/server.js" /opt/fry-store/server.js
command -v node >/dev/null || sudo apt-get install -y nodejs
sudo tee /etc/systemd/system/fry-store.service >/dev/null <<'U'
[Unit]
Description=Fry Store
After=network.target
[Service]
ExecStart=/usr/bin/env node /opt/fry-store/server.js
Restart=always
User=ubuntu
[Install]
WantedBy=multi-user.target
U
sudo chown -R ubuntu /var/lib/fry-store
sudo systemctl daemon-reload && sudo systemctl enable --now fry-store && sudo systemctl restart fry-store
if ! command -v caddy >/dev/null; then sudo apt-get install -y caddy; fi
if ! grep -q 140-238-55-153.sslip.io /etc/caddy/Caddyfile 2>/dev/null; then
  printf '\n140-238-55-153.sslip.io {\n  reverse_proxy 127.0.0.1:8787\n}\n' | sudo tee -a /etc/caddy/Caddyfile >/dev/null
fi
sudo ufw allow 80/tcp 2>/dev/null || true; sudo ufw allow 443/tcp 2>/dev/null || true
sudo systemctl restart caddy
echo "OK: https://140-238-55-153.sslip.io/v/00000000000000000000000000000000/test  (should print [])"
