import WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import { writeFileSync } from "fs";

const WS_URL = "ws://localhost:3055";
const CHANNEL = process.env.CHANNEL || "u674fb2r";

type Node = any;

function send(ws: WebSocket, data: any) { ws.send(JSON.stringify(data)); }

function join(ws: WebSocket, channel: string): Promise<void> {
  const id = uuidv4();
  return new Promise((resolve, reject) => {
    const onMessage = (raw: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg?.message?.id === id || msg?.message?.result?.includes?.("Connected to channel")) {
          ws.removeListener("message", onMessage); resolve();
        }
      } catch {}
    };
    ws.on("message", onMessage);
    send(ws, { type: "join", channel, id });
    setTimeout(() => { ws.removeListener("message", onMessage); reject(new Error("Join timeout")); }, 5000);
  });
}

function call(ws: WebSocket, command: string, params: any = {}): Promise<any> {
  const id = uuidv4();
  return new Promise((resolve, reject) => {
    const onMessage = (raw: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(raw.toString());
        const payload = msg?.message;
        if (payload?.id === id && (payload?.result || payload?.error)) {
          ws.removeListener("message", onMessage);
          if (payload.error) reject(new Error(payload.error)); else resolve(payload.result);
        }
      } catch {}
    };
    ws.on("message", onMessage);
    send(ws, { type: "message", channel: CHANNEL, message: { id, command, params: { ...params, commandId: id } } });
    setTimeout(() => { ws.removeListener("message", onMessage); reject(new Error(`${command} timeout`)); }, 20000);
  });
}

function escapeHtml(text: string) { return text.replace(/[&<>]/g, s => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[s]!)); }

function toCssColor(fill: any) {
  if (!fill || !fill.color) return "transparent";
  const { r, g, b, a = 1 } = fill.color; // 0..1
  return `rgba(${Math.round(r*255)}, ${Math.round(g*255)}, ${Math.round(b*255)}, ${a})`;
}

function renderNode(node: Node, styles: string[], depth = 0): string {
  const indent = (n: number) => "  ".repeat(n);
  const className = `n_${node.id.replace(/[^a-zA-Z0-9_]/g, "")}`;

  if (node.type === "TEXT") {
    const fontSize = node.style?.fontSize || 14;
    const fontWeight = node.style?.fontWeight || 400;
    styles.push(`.${className}{font-size:${fontSize}px;font-weight:${fontWeight};color:#111;}`);
    return `${indent(depth)}<div class="${className}">${escapeHtml(node.characters || "")}</div>`;
  }

  const children = (node.children || []).map((c: Node) => renderNode(c, styles, depth + 1)).join("\n");

  const layoutMode = node.layoutMode || "NONE";
  const display = layoutMode === "HORIZONTAL" || layoutMode === "VERTICAL" ? "flex" : "block";
  const flexDir = layoutMode === "HORIZONTAL" ? "row" : layoutMode === "VERTICAL" ? "column" : "initial";
  const gap = node.itemSpacing ? `gap:${node.itemSpacing}px;` : "";
  const pad = `padding:${node.paddingTop||0}px ${node.paddingRight||0}px ${node.paddingBottom||0}px ${node.paddingLeft||0}px;`;
  const bg = node.fills && node.fills[0] ? `background:${toCssColor(node.fills[0])};` : "";
  styles.push(`.${className}{display:${display};flex-direction:${flexDir};${gap}${pad}${bg}}`);
  const nameAttr = node.name ? ` data-name="${escapeHtml(node.name)}"` : "";
  return `${indent(depth)}<section class="${className}"${nameAttr}>\n${children}\n${indent(depth)}</section>`;
}

async function main(){
  const ws = new WebSocket(WS_URL);
  await new Promise<void>((res, rej)=>{ ws.once("open", ()=>res()); ws.once("error", rej); });
  await join(ws, CHANNEL);
  const selection = await call(ws, "read_my_design", {});
  const root: Node = Array.isArray(selection) ? selection[0] : selection;
  if (!root || !root.children) throw new Error("No selection");

  const styles: string[] = [];
  const htmlBody = renderNode(root, styles, 2);
  const html = `<!doctype html>\n<html lang=\"ko\">\n<head>\n  <meta charset=\"utf-8\"/>\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/>\n  <title>${escapeHtml(root.name||"Export")}</title>\n  <link rel=\"stylesheet\" href=\"./styles.css\"/>\n  <style>/* quick fallback for preview */ body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Noto Sans KR,Arial,sans-serif;margin:0;padding:24px;background:#fff;color:#111} .root{max-width:1200px;margin:0 auto}</style>\n</head>\n<body>\n  <main class=\"root\">\n${htmlBody}\n  </main>\n</body>\n</html>`;

  const baseCss = `/* Generated from Figma selection */\nsection{box-sizing:border-box}\n`; 
  writeFileSync("test/index.html", html, "utf8");
  writeFileSync("test/styles.css", baseCss + styles.join("\n"), "utf8");
  console.log(`Exported selection '${root.name}' to test/index.html + styles.css`);
  ws.close();
}

main().catch(e=>{ console.error(e); process.exit(1); });



