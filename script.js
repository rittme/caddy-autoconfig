const http = require('http');

const interval = process.env.INTERVAL || 30000; // Default to 30 seconds
const dockerSocket = process.env.DOCKER_SOCK || '/var/run/docker.sock';
const upstreamIp = process.env.UPSTREAM_IP;
const caddyAPI = new URL(process.env.CADDY_API);
const dockerApiVersion = '1.41';

const options = {
  socketPath: dockerSocket,
  path: `http://${dockerApiVersion}/containers/json`,
};

const callback = (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    let response = JSON.parse(data);
    console.log('Docker containers data loaded');
    reconfigCaddy(response);
  });

  res.on('error', (err) => {
    throw new Error(`Error loading Docker config: ${err}`);
  });
};

const parseDockerLabels = (dockerResponse) =>
  dockerResponse.reduce((labels, container) => {
    if (!container || !container.Labels) {
      return labels;
    }
    const l = container.Labels;
    if (l['autoproxy.port'] && l['autoproxy.url']) {
      labels.push({
        port: l['autoproxy.port'],
        url: l['autoproxy.url'],
      });
    }
    return labels;
  }, []);

const createCaddyRoute = (url, port) => {
  return {
    handle: [
      {
        handler: 'subroute',
        routes: [
          {
            handle: [
              {
                handler: 'reverse_proxy',
                upstreams: [
                  {
                    dial: `${upstreamIp}:${port}`,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    match: [
      {
        host: [url],
      },
    ],
    terminal: true,
  };
};

const updateCaddy = (config) => {
  // Build the post string from an object
  var post_data = JSON.stringify(config);

  // An object of options to indicate where to post to
  var post_options = {
    host: caddyAPI.hostname,
    port: caddyAPI.port || '80',
    path: '/load',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(post_data),
    },
  };

  // Set up the request
  var post_req = http.request(post_options, function (res) {
    res.setEncoding('utf8');
    let data = '';
    res.on('data', function (chunk) {
      data += chunk;
    });
    res.on('end', () => {
      let response = data;
      console.log(`Caddy updated. ${response}`);
    });

    res.on('error', (err) => {
      throw new Error(`Caddy update error: ${err}`);
    });
  });

  // post the data
  post_req.write(post_data);
  post_req.end();
};

let cacheDockerLabels = '';
const reconfigCaddy = (dockerResponse) => {
  const dockerLabels = parseDockerLabels(dockerResponse);

  if (!dockerLabels) {
    throw new Error('No autoproxy labels found');
  }

  const labelsJSON = JSON.stringify(dockerLabels);
  if (labelsJSON === cacheDockerLabels) {
    return;
  }
  console.log('Configs changed!');
  cacheDockerLabels = labelsJSON;

  const routes = dockerLabels.map(({ url, port }) =>
    createCaddyRoute(url, port)
  );

  const config = {
    admin: {
      listen: '0.0.0.0:2019',
    },
    apps: {
      http: {
        servers: {
          srv0: {
            automatic_https: {
              disable: true,
            },
            listen: [':80', ':443'],
            routes,
          },
        },
      },
    },
  };

  updateCaddy(config);
};

const mainLoop = () => {
  if (dockerSocket.startsWith('http')) {
    http.get(
      `http://${dockerSocket}/${dockerApiVersion}/containers/json`,
      callback
    );
  } else {
    const clientRequest = http.request(options, callback);
    clientRequest.end();
  }

  setTimeout(mainLoop, interval);
};
mainLoop();
