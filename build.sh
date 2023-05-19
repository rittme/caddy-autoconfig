docker build -t caddy-autoconfig:alpha .
docker tag caddy-autoconfig:alpha rittme/caddy-autoconfig:alpha
docker tag caddy-autoconfig:alpha rittme/caddy-autoconfig:latest
docker tag caddy-autoconfig:alpha caddy-autoconfig:latest
docker push rittme/caddy-autoconfig:alpha
docker push rittme/caddy-autoconfig:latest
