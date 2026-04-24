const http = require("http");
const fs = require("fs");
const path = require("path");

const HOST = "127.0.0.1";
const START_PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendFile(res, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extension] || "application/octet-stream";

  fs.readFile(filePath, (error, data) => {
    if (error) {
      if (error.code === "ENOENT") {
        sendJson(res, 404, {
          success: false,
          message: "File not found"
        });
        return;
      }

      sendJson(res, 500, {
        success: false,
        message: "Unable to read requested file"
      });
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store"
    });
    res.end(data);
  });
}

function resolveRequestPath(urlPath) {
  const normalizedPath = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.normalize(path.join(ROOT, normalizedPath));

  if (!filePath.startsWith(ROOT)) {
    return null;
  }

  return filePath;
}

function createServer(port) {
  return http.createServer((req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host || `${HOST}:${port}`}`);
    const filePath = resolveRequestPath(requestUrl.pathname);

    if (!filePath) {
      sendJson(res, 400, {
        success: false,
        message: "Invalid path"
      });
      return;
    }

    fs.stat(filePath, (error, stats) => {
      if (!error && stats.isDirectory()) {
        sendFile(res, path.join(filePath, "index.html"));
        return;
      }

      if (error && requestUrl.pathname !== "/") {
        sendFile(res, path.join(ROOT, "index.html"));
        return;
      }

      sendFile(res, filePath);
    });
  });
}

function listen(port) {
  const server = createServer(port);

  server.once("error", (error) => {
    if (error.code === "EADDRINUSE") {
      listen(port + 1);
      return;
    }

    console.error("Frontend server failed to start.", error);
    process.exit(1);
  });

  server.listen(port, HOST, () => {
    console.log(`Retail RMS frontend running at http://${HOST}:${port}`);
    if (port !== START_PORT) {
      console.log(`Port ${START_PORT} was busy, so the server used ${port} instead.`);
    }
  });
}

listen(START_PORT);
