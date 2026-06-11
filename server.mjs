import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { randomUUID } from "node:crypto";

const root = process.cwd();
const port = 3000;
const dataDir = join(root, "data");
const dataFile = join(dataDir, "store.json");
const salesPassword = "gujiaying";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
};

function defaultStore() {
  return {
    settings: {
      prices: {
        veneer: 1800,
        solid: 2800,
      },
    },
    quotes: [],
  };
}

function ensureStore() {
  if (!existsSync(dataDir)) mkdirSync(dataDir);
  if (!existsSync(dataFile)) writeFileSync(dataFile, JSON.stringify(defaultStore(), null, 2));
}

function readStore() {
  ensureStore();
  try {
    return { ...defaultStore(), ...JSON.parse(readFileSync(dataFile, "utf8")) };
  } catch {
    return defaultStore();
  }
}

function writeStore(store) {
  ensureStore();
  writeFileSync(dataFile, JSON.stringify(store, null, 2));
}

function sendJson(response, status, data) {
  const body = JSON.stringify(data);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  response.end(body);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || "").trim());
}

function checkPassword(request) {
  return request.headers["x-sales-password"] === salesPassword;
}

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/settings") {
    sendJson(response, 200, readStore().settings);
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/quotes") {
    try {
      const payload = await readBody(request);
      if (!isValidPhone(payload.phone)) {
        sendJson(response, 400, { error: "INVALID_PHONE" });
        return true;
      }

      const store = readStore();
      const quote = {
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        ...payload,
        phone: String(payload.phone).trim(),
      };
      store.quotes.unshift(quote);
      writeStore(store);
      sendJson(response, 201, quote);
    } catch {
      sendJson(response, 400, { error: "INVALID_BODY" });
    }
    return true;
  }

  if (url.pathname.startsWith("/api/sales/")) {
    if (!checkPassword(request)) {
      sendJson(response, 401, { error: "UNAUTHORIZED" });
      return true;
    }

    if (request.method === "GET" && url.pathname === "/api/sales/quotes") {
      sendJson(response, 200, { quotes: readStore().quotes });
      return true;
    }

    if (request.method === "DELETE" && url.pathname === "/api/sales/quotes") {
      const store = readStore();
      store.quotes = [];
      writeStore(store);
      sendJson(response, 200, { ok: true });
      return true;
    }

    if (request.method === "POST" && url.pathname === "/api/sales/settings") {
      try {
        const payload = await readBody(request);
        const veneer = Math.max(0, Number(payload.prices?.veneer || 0));
        const solid = Math.max(0, Number(payload.prices?.solid || 0));
        const store = readStore();
        store.settings = { prices: { veneer, solid } };
        writeStore(store);
        sendJson(response, 200, store.settings);
      } catch {
        sendJson(response, 400, { error: "INVALID_BODY" });
      }
      return true;
    }
  }

  return false;
}

function serveStatic(response, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = normalize(join(root, requestedPath));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const fileStat = statSync(filePath);
    if (!fileStat.isFile()) throw new Error("Not a file");

    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
      "Content-Length": fileStat.size,
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end("Not found");
  }
}

createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

  if (await handleApi(request, response, url)) return;

  if (url.pathname === "/sales") {
    serveStatic(response, "/sales.html");
    return;
  }

  serveStatic(response, url.pathname);
}).listen(port, "0.0.0.0", () => {
  ensureStore();
  console.log(`Serving http://0.0.0.0:${port} without cache`);
});
