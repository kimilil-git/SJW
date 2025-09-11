import WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";

type Color = { r: number; g: number; b: number; a?: number };

const WS_URL = "ws://localhost:3055";
const CHANNEL = process.env.CHANNEL || "koa6irgu";
const X = Number(process.env.X || 100);
const Y = Number(process.env.Y || 100);
const LABEL = process.env.LABEL || "Primary";

function send(ws: WebSocket, data: any) {
  ws.send(JSON.stringify(data));
}

function join(ws: WebSocket, channel: string): Promise<void> {
  const id = uuidv4();
  return new Promise((resolve, reject) => {
    const onMessage = (raw: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg?.message?.id === id || msg?.message?.result?.includes?.("Connected to channel")) {
          ws.removeListener("message", onMessage);
          resolve();
        }
      } catch {}
    };
    ws.on("message", onMessage);
    send(ws, { type: "join", channel, id });
    setTimeout(() => {
      ws.removeListener("message", onMessage);
      reject(new Error("Join timeout"));
    }, 5000);
  });
}

function call(ws: WebSocket, channel: string, command: string, params: any): Promise<any> {
  const id = uuidv4();
  return new Promise((resolve, reject) => {
    const onMessage = (raw: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(raw.toString());
        const payload = msg?.message;
        if (payload?.id === id && (payload?.result || payload?.error)) {
          ws.removeListener("message", onMessage);
          if (payload.error) reject(new Error(payload.error));
          else resolve(payload.result);
        }
      } catch {}
    };
    ws.on("message", onMessage);
    send(ws, {
      type: "message",
      channel,
      message: { id, command, params: { ...params, commandId: id } },
    });
    setTimeout(() => {
      ws.removeListener("message", onMessage);
      reject(new Error(`${command} timeout`));
    }, 15000);
  });
}

async function createButtonVariant(ws: WebSocket, parentId: string, name: string, fill: Color, text: string, textColor?: Color) {
  const frame = (await call(ws, CHANNEL, "create_frame", {
    x: 0,
    y: 0,
    width: 120,
    height: 40,
    name,
    parentId,
    fillColor: fill,
    layoutMode: "HORIZONTAL",
    paddingTop: 10,
    paddingRight: 16,
    paddingBottom: 10,
    paddingLeft: 16,
    primaryAxisAlignItems: "CENTER",
    counterAxisAlignItems: "CENTER",
    layoutSizingHorizontal: "HUG",
    layoutSizingVertical: "HUG",
  })) as { id: string; name: string };

  await call(ws, CHANNEL, "set_corner_radius", { nodeId: (frame as any).id, radius: 8, corners: [true, true, true, true] });

  await call(ws, CHANNEL, "create_text", {
    x: 0,
    y: 0,
    text,
    fontSize: 14,
    fontWeight: 600,
    fontColor: textColor || { r: 1, g: 1, b: 1, a: 1 },
    name: "Label",
    parentId: (frame as any).id,
  });
}

async function main() {
  const ws = new WebSocket(WS_URL);
  await new Promise<void>((resolve, reject) => {
    ws.once("open", () => resolve());
    ws.once("error", (e) => reject(e));
  });

  await join(ws, CHANNEL);

  const parent = (await call(ws, CHANNEL, "create_frame", {
    x: X,
    y: Y,
    width: 360,
    height: 200,
    name: "Buttons/Primary",
    fillColor: { r: 1, g: 1, b: 1, a: 0 },
    layoutMode: "VERTICAL",
    paddingTop: 8,
    paddingRight: 8,
    paddingBottom: 8,
    paddingLeft: 8,
    itemSpacing: 8,
  })) as { id: string; name: string };

  const baseLabel = LABEL;

  await createButtonVariant(ws, (parent as any).id, "Primary/Default", { r: 0.09, g: 0.35, b: 0.88, a: 1 }, baseLabel);
  await createButtonVariant(ws, (parent as any).id, "Primary/Hover", { r: 0.07, g: 0.3, b: 0.78, a: 1 }, baseLabel);
  await createButtonVariant(ws, (parent as any).id, "Primary/Disabled", { r: 0.82, g: 0.85, b: 0.9, a: 1 }, baseLabel, { r: 1, g: 1, b: 1, a: 0.6 });

  console.log(`Created Primary Button Set at (${X}, ${Y}) in channel ${CHANNEL}`);
  ws.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});



