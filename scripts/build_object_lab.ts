import WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";

type Color = { r: number; g: number; b: number; a?: number };

const WS_URL = "ws://localhost:3055";
const CHANNEL = process.env.CHANNEL || "koa6irgu";

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
    }, 20000);
  });
}

async function createText(ws: WebSocket, parentId: string, text: string, size: number, weight = 700, color: Color = { r: 0.07, g: 0.07, b: 0.07, a: 1 }) {
  return call(ws, CHANNEL, "create_text", { x: 0, y: 0, text, fontSize: size, fontWeight: weight, fontColor: color, parentId });
}

async function spacer(ws: WebSocket, parentId: string, h: number) {
  return call(ws, CHANNEL, "create_frame", { x: 0, y: 0, width: 1200, height: h, name: "spacer", parentId, fillColor: { r: 1, g: 1, b: 1, a: 0 } });
}

async function imagePlaceholder(ws: WebSocket, parentId: string, w: number, h: number, name: string) {
  const frame = await call(ws, CHANNEL, "create_frame", {
    x: 0, y: 0, width: w, height: h, name, parentId,
    fillColor: { r: 0.95, g: 0.95, b: 0.95, a: 1 },
    layoutMode: "NONE"
  });
  return frame as { id: string };
}

async function main() {
  const ws = new WebSocket(WS_URL);
  await new Promise<void>((resolve, reject) => { ws.once("open", () => resolve()); ws.once("error", reject); });
  await join(ws, CHANNEL);

  // Page frame
  const page = await call(ws, CHANNEL, "create_frame", {
    x: 100, y: 100, width: 1440, height: 3800, name: "Object Lab Landing",
    fillColor: { r: 1, g: 1, b: 1, a: 1 }, layoutMode: "VERTICAL",
    paddingTop: 64, paddingRight: 80, paddingBottom: 120, paddingLeft: 80, itemSpacing: 56,
  }) as { id: string };

  // Header
  const header = await call(ws, CHANNEL, "create_frame", {
    x: 0, y: 0, width: 1280, height: 80, name: "Header", parentId: page.id,
    fillColor: { r: 1, g: 1, b: 1, a: 0 }, layoutMode: "HORIZONTAL",
    primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER",
    paddingTop: 8, paddingBottom: 8
  }) as { id: string };
  await createText(ws, header.id, "Object Lab", 48, 700);
  await createText(ws, header.id, "회사소개   마감재   LED디스플레이   프로젝트   문의", 14, 600, { r: 0.35, g: 0.35, b: 0.38, a: 1 });

  // Hero image
  await imagePlaceholder(ws, page.id, 1280, 560, "Hero Image");

  // Intro section
  const intro = await call(ws, CHANNEL, "create_frame", {
    x: 0, y: 0, width: 1280, height: 360, name: "Intro", parentId: page.id,
    fillColor: { r: 1, g: 1, b: 1, a: 0 }, layoutMode: "HORIZONTAL",
    primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER"
  }) as { id: string };
  const introLeft = await call(ws, CHANNEL, "create_frame", {
    x: 0, y: 0, width: 600, height: 340, name: "IntroLeft", parentId: intro.id,
    fillColor: { r: 1, g: 1, b: 1, a: 0 }, layoutMode: "VERTICAL", itemSpacing: 12
  }) as { id: string };
  await createText(ws, introLeft.id, "Finish with Design\nObject Lab", 44, 700);
  const introRight = await call(ws, CHANNEL, "create_frame", {
    x: 0, y: 0, width: 600, height: 340, name: "IntroRight", parentId: intro.id,
    fillColor: { r: 1, g: 1, b: 1, a: 0 }, layoutMode: "VERTICAL", itemSpacing: 10
  }) as { id: string };
  await createText(ws, introRight.id, "디자인으로 공간을 완성하고 새로운 가치를 더하는 기업", 14, 700, { r: 0.2, g: 0.2, b: 0.22, a: 1 });
  await createText(ws, introRight.id, "오브젝트랩은 공간의 쓰임과 맥락에서 시작해...", 12, 500, { r: 0.45, g: 0.45, b: 0.48, a: 1 });

  // Two feature tiles
  const features = await call(ws, CHANNEL, "create_frame", {
    x: 0, y: 0, width: 1280, height: 420, name: "Features", parentId: page.id,
    layoutMode: "HORIZONTAL", itemSpacing: 8
  }) as { id: string };
  const leftTile = await imagePlaceholder(ws, features.id, 636, 420, "Finishing Materials");
  const rightTile = await imagePlaceholder(ws, features.id, 636, 420, "LED Display");

  // Product grid title
  await createText(ws, page.id, "Product", 36, 700);

  // Product grid 3 x 3
  const grid = await call(ws, CHANNEL, "create_frame", {
    x: 0, y: 0, width: 1280, height: 720, name: "Product Grid", parentId: page.id,
    layoutMode: "VERTICAL", itemSpacing: 8
  }) as { id: string };
  for (let r = 0; r < 3; r++) {
    const row = await call(ws, CHANNEL, "create_frame", {
      x: 0, y: 0, width: 1280, height: 232, name: `row-${r+1}`, parentId: grid.id,
      layoutMode: "HORIZONTAL", itemSpacing: 8
    }) as { id: string };
    for (let c = 0; c < 3; c++) {
      await imagePlaceholder(ws, row.id, 418, 232, `item-${r*3+c+1}`);
    }
  }

  // Contact section
  const contact = await call(ws, CHANNEL, "create_frame", {
    x: 0, y: 0, width: 1280, height: 520, name: "Contact", parentId: page.id,
    fillColor: { r: 0.08, g: 0.08, b: 0.09, a: 1 }, layoutMode: "HORIZONTAL",
    primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER",
    paddingLeft: 32, paddingRight: 32
  }) as { id: string };
  await createText(ws, contact.id, "Contact Us", 36, 700, { r: 1, g: 1, b: 1, a: 1 });
  const form = await call(ws, CHANNEL, "create_frame", {
    x: 0, y: 0, width: 700, height: 420, name: "Form", parentId: contact.id,
    layoutMode: "VERTICAL", itemSpacing: 8, fillColor: { r: 1, g: 1, b: 1, a: 0 }
  }) as { id: string };
  await imagePlaceholder(ws, form.id, 700, 56, "성함");
  await imagePlaceholder(ws, form.id, 700, 56, "연락처");
  await imagePlaceholder(ws, form.id, 700, 56, "회사명");
  await imagePlaceholder(ws, form.id, 700, 180, "문의내용");

  // Footer
  await createText(ws, page.id, "Object Lab", 18, 700, { r: 0.18, g: 0.18, b: 0.2, a: 1 });

  console.log(`Created Object Lab landing in channel ${CHANNEL}`);
  ws.close();
}

main().catch((e) => { console.error(e); process.exit(1); });



