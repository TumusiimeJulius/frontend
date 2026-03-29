const http = require("http");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");

const DEFAULT_STATE = {
  theme: "light",
  activeBoardId: "b1",
  boards: [
    {
      id: "b1",
      name: "Product Sprint",
      lists: [
        {
          id: "l1",
          title: "To Do",
          cards: [
            {
              id: "c1",
              title: "Wireframe onboarding",
              description: "Draft initial mobile + desktop onboarding screens.",
              dueDate: "2026-04-04",
              priority: "high",
              assignee: "Alice",
            },
            {
              id: "c2",
              title: "API checklist",
              description: "Confirm endpoints needed for MVP drag/drop.",
              dueDate: "2026-04-07",
              priority: "medium",
              assignee: "Tom",
            },
          ],
        },
        {
          id: "l2",
          title: "In Progress",
          cards: [
            {
              id: "c3",
              title: "Board UI polish",
              description: "Improve spacing and task metadata readability.",
              dueDate: "2026-04-03",
              priority: "medium",
              assignee: "Nina",
            },
          ],
        },
        {
          id: "l3",
          title: "Done",
          cards: [
            {
              id: "c4",
              title: "Project setup",
              description: "Create base structure and reusable modal.",
              dueDate: "2026-03-29",
              priority: "low",
              assignee: "Sam",
            },
          ],
        },
      ],
    },
    {
      id: "b2",
      name: "Personal Tasks",
      lists: [
        { id: "l4", title: "Backlog", cards: [] },
        { id: "l5", title: "Doing", cards: [] },
      ],
    },
  ],
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

async function ensureStateFile() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STATE_FILE)) {
    await fsp.writeFile(STATE_FILE, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
  }
}

function validateState(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (!Array.isArray(payload.boards) || payload.boards.length === 0) return false;
  if (payload.theme !== "light" && payload.theme !== "dark") return false;
  if (typeof payload.activeBoardId !== "string") return false;
  return true;
}

async function readState() {
  await ensureStateFile();
  try {
    const raw = await fsp.readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!validateState(parsed)) throw new Error("Invalid state file");
    return parsed;
  } catch (error) {
    await fsp.writeFile(STATE_FILE, JSON.stringify(DEFAULT_STATE, null, 2), "utf8");
    return DEFAULT_STATE;
  }
}

async function writeState(payload) {
  await ensureStateFile();
  await fsp.writeFile(STATE_FILE, JSON.stringify(payload, null, 2), "utf8");
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": MIME[".json"] });
  res.end(JSON.stringify(payload));
}

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function handleApiState(req, res) {
  if (req.method === "GET") {
    const state = await readState();
    sendJson(res, 200, state);
    return;
  }

  if (req.method === "PUT") {
    try {
      const body = await getRequestBody(req);
      const payload = JSON.parse(body || "{}");
      if (!validateState(payload)) {
        sendJson(res, 400, { error: "Invalid state payload" });
        return;
      }
      await writeState(payload);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      sendJson(res, 400, { error: "Malformed JSON payload" });
    }
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
}

async function handleStatic(req, res, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const safePath = path.normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT, safePath);
  if (!filePath.startsWith(ROOT)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  try {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    const data = await fsp.readFile(filePath);
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  } catch (error) {
    sendJson(res, 404, { error: "Not found" });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname === "/api/state") {
    await handleApiState(req, res);
    return;
  }

  await handleStatic(req, res, pathname);
});

server.listen(PORT, async () => {
  await ensureStateFile();
  console.log(`Server running at http://localhost:${PORT}`);
});
