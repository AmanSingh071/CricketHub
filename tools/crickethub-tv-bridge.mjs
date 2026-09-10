#!/usr/bin/env node
import http from "node:http";
import dgram from "node:dgram";
import os from "node:os";
import { URL } from "node:url";

const PORT = Number(process.env.CRICKETHUB_TV_BRIDGE_PORT || 38421);
const SSDP_ADDRESS = "239.255.255.250";
const SSDP_PORT = 1900;
const SEARCH_TARGETS = [
  "urn:dial-multiscreen-org:service:dial:1",
  "urn:schemas-upnp-org:device:MediaRenderer:1",
  "urn:schemas-upnp-org:device:MediaServer:1",
  "upnp:rootdevice",
];

const devices = new Map();

function localAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const item of list || []) {
      if (item.family === "IPv4" && !item.internal) out.push(item.address);
    }
  }
  return out;
}

function parseHeaders(message) {
  const lines = message.split(/\r?\n/);
  const headers = {};
  for (const line of lines.slice(1)) {
    const i = line.indexOf(":");
    if (i > 0) headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  return headers;
}

function deviceKey(headers, address) {
  return headers.usn || headers.location || `${address}-${headers.st}`;
}

async function inspectDevice(device) {
  if (!device.location || !device.location.startsWith("http://")) return;
  try {
    const response = await fetch(device.location, { signal: AbortSignal.timeout(1800) });
    const xml = await response.text();
    const pick = (tag) => {
      const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, "i"));
      return match?.[1]?.trim() || "";
    };
    device.name = pick("friendlyName") || device.name;
    device.manufacturer = pick("manufacturer") || device.manufacturer;
    device.model = pick("modelName") || device.model;
  } catch {}
}

function scan() {
  return new Promise((resolve) => {
    const socket = dgram.createSocket("udp4");
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      try { socket.close(); } catch {}
      resolve([...devices.values()]);
    };

    socket.on("message", (buffer, rinfo) => {
      const headers = parseHeaders(buffer.toString());
      const key = deviceKey(headers, rinfo.address);
      const current = devices.get(key) || {
        id: key,
        ip: rinfo.address,
        name: rinfo.address,
        manufacturer: "",
        model: "",
        type: "LAN device",
        location: headers.location || "",
      };
      current.ip = rinfo.address;
      current.location = headers.location || current.location;
      current.st = headers.st || current.st || "";
      current.usn = headers.usn || current.usn || "";
      const text = `${headers.server || ""} ${headers.st || ""} ${headers.usn || ""}`.toLowerCase();
      current.type = text.includes("dial") ? "DIAL / Smart TV" : text.includes("mediarenderer") ? "DLNA TV / Renderer" : "LAN device";
      devices.set(key, current);
      void inspectDevice(current);
    });

    socket.bind(() => {
      for (const st of SEARCH_TARGETS) {
        const packet = [
          "M-SEARCH * HTTP/1.1",
          `HOST: ${SSDP_ADDRESS}:${SSDP_PORT}`,
          'MAN: "ssdp:discover"',
          "MX: 2",
          `ST: ${st}`,
          "", "",
        ].join("\r\n");
        socket.send(Buffer.from(packet), SSDP_PORT, SSDP_ADDRESS);
      }
    });
    setTimeout(done, 3200);
  });
}

function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Private-Network": "true",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Private-Network": "true",
    });
    return res.end();
  }
  if (url.pathname === "/health") return json(res, 200, { ok: true, service: "CricketHub TV Bridge", port: PORT });
  if (url.pathname === "/network") return json(res, 200, { addresses: localAddresses(), port: PORT });
  if (url.pathname === "/devices") return json(res, 200, { devices: await scan(), scannedAt: new Date().toISOString() });
  json(res, 404, { error: "Not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`CricketHub TV Bridge running on http://127.0.0.1:${PORT}`);
  console.log(`LAN addresses: ${localAddresses().join(", ") || "none detected"}`);
  console.log("Use the Mirror to TV button in CricketHub and choose Find TVs.");
});
