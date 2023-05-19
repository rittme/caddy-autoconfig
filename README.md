> :warning: This service is still in very early stages of development. Use with caution.

# Caddy Docker Auto-config
This is a small script to help auto-configuring Caddy v2 proxies on homelabs running on docker.

The script will look for two labels on docker containers:
  * `autoconfig.url`: the URL you want to use for the service being proxied
  * `autoconfig.port`: the port the service runs on

## Configuration
You can configure you Caddy Docker Auto-config through the following options:

- `UPSTREAM_IP`: The IP address of the interface the upstream services are exposed. **Required**
- `CADDY_API`: The address of the exposed Caddy V2 API. **Required**
- `INTERVAL`: The interval updates of the caddy config, in milliseconds (default: 30 seconds)
- `DOCKER_SOCK`: The path to the docker socket, change if you're using Docker Socket Proxy instead (default: `/var/run/docker.sock`)

## Example Docker Compose
Here is a docker compose for this script:

```yaml
  example-container:
    image: example
    ports:
      - 8080:80
    labels:
      - autoproxy.port=8080
      - autoproxy.url=example.home

  caddy-autoconfig:
    image: rittme/caddy-autoconfig:latest
    container_name: caddy-autoconfig
    restart: unless-stopped
    environment:
      - UPSTREAM_IP=10.0.0.2
      - CADDY_API=http://10.0.0.2:2019
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
```
> :warning: **Exposing your Caddy API like this is not safe**: Make sure you expose it in a safer way.

## Docker socket
You can use the docker socket directly as showed in the example, but be aware you are potentially giving root access to your host.

A safer alternative would be to use (Docker Socket Proxy)[https://github.com/Tecnativa/docker-socket-proxy], and give access only to the `CONTAINERS` API section.
