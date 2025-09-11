import WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import { writeFileSync } from "fs";

const WS_URL = "ws://localhost:3055";
const CHANNEL = process.env.CHANNEL || "evpdidww";
const NODE_ID = process.env.NODE_ID || "5:59";

type Node = any;

function send(ws: WebSocket, data: any) { ws.send(JSON.stringify(data)); }

async function join(ws: WebSocket, channel: string) {
  const id = uuidv4();
  await new Promise<void>((resolve, reject) => {
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

function escapeHtml(text: string) { return (text||"").replace(/[&<>]/g, s => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[s]!)); }

function toCssColor(fill: any) {
  if (!fill || !fill.color) return "transparent";
  const { r, g, b, a = 1 } = fill.color;
  const to255 = (v: number) => Math.round((v <= 1 ? v * 255 : v));
  return `rgba(${to255(r)}, ${to255(g)}, ${to255(b)}, ${a})`;
}

function getDummyImage(width: number, height: number, type: string = "abstract"): string {
  const colors = {
    abstract: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8"],
    tech: ["#2C3E50", "#34495E", "#3498DB", "#2980B9", "#1ABC9C", "#16A085", "#27AE60"],
    modern: ["#E74C3C", "#ECF0F1", "#95A5A6", "#BDC3C7", "#7F8C8D", "#34495E", "#2C3E50"]
  };
  const colorSet = colors[type as keyof typeof colors] || colors.abstract;
  const color = colorSet[Math.floor(Math.random() * colorSet.length)];
  return `https://via.placeholder.com/${width}x${height}/${color.replace('#', '')}/FFFFFF?text=${width}x${height}`;
}

function renderNode(node: Node, styles: string[], depth = 0): string {
  const indent = (n: number) => "  ".repeat(n);
  const className = `n_${node.id.replace(/[^a-zA-Z0-9_]/g, "")}`;

  if (node.type === "TEXT") {
    const fontSize = node.style?.fontSize || 14;
    const fontWeight = node.style?.fontWeight || 400;
    const color = node.fills && node.fills[0] ? toCssColor(node.fills[0]) : "#111";
    const textAlign = node.style?.textAlignHorizontal || "left";
    styles.push(`.${className}{font-size:${fontSize}px;font-weight:${fontWeight};color:${color};text-align:${textAlign};}`);
    return `${indent(depth)}<div class="${className}">${escapeHtml(node.characters)}</div>`;
  }

  // Handle image placeholders for rectangles that might be images
  if (node.type === "RECTANGLE" && node.absoluteBoundingBox) {
    const { width, height } = node.absoluteBoundingBox;
    const bg = node.fills && node.fills[0] ? toCssColor(node.fills[0]) : "";
    
    // If it's a large rectangle, treat it as an image
    if (width > 100 && height > 100) {
      const dummyImg = getDummyImage(Math.round(width), Math.round(height));
      styles.push(`.${className}{width:${Math.round(width)}px;height:${Math.round(height)}px;${bg}border-radius:${node.cornerRadius || 0}px;overflow:hidden;}`);
      return `${indent(depth)}<div class="${className}"><img src="${dummyImg}" alt="placeholder" style="width:100%;height:100%;object-fit:cover;"/></div>`;
    } else {
      styles.push(`.${className}{width:${Math.round(width)}px;height:${Math.round(height)}px;${bg}border-radius:${node.cornerRadius || 0}px;}`);
      return `${indent(depth)}<div class="${className}"></div>`;
    }
  }

  const children = (node.children || []).map((c: Node) => renderNode(c, styles, depth + 1)).join("\n");
  const layoutMode = node.layoutMode || "NONE";
  const display = layoutMode === "HORIZONTAL" || layoutMode === "VERTICAL" ? "flex" : "block";
  const flexDir = layoutMode === "HORIZONTAL" ? "row" : layoutMode === "VERTICAL" ? "column" : "initial";
  const gap = node.itemSpacing ? `gap:${node.itemSpacing}px;` : "";
  const pad = `padding:${node.paddingTop||0}px ${node.paddingRight||0}px ${node.paddingBottom||0}px ${node.paddingLeft||0}px;`;
  const bg = node.fills && node.fills[0] ? `background:${toCssColor(node.fills[0])};` : "";
  const width = node.absoluteBoundingBox?.width ? `width:${Math.round(node.absoluteBoundingBox.width)}px;` : "";
  const height = node.absoluteBoundingBox?.height ? `min-height:${Math.round(node.absoluteBoundingBox.height)}px;` : "";
  const align = layoutMode !== "NONE" ? `align-items:center;justify-content:flex-start;` : "";
  const cornerRadius = node.cornerRadius ? `border-radius:${node.cornerRadius}px;` : "";
  
  styles.push(`.${className}{display:${display};flex-direction:${flexDir};${gap}${pad}${bg}${width}${height}${align}${cornerRadius}}`);
  const nameAttr = node.name ? ` data-name="${escapeHtml(node.name)}"` : "";
  return `${indent(depth)}<section class="${className}"${nameAttr}>\n${children}\n${indent(depth)}</section>`;
}

async function main(){
  const ws = new WebSocket(WS_URL);
  await new Promise<void>((res, rej)=>{ ws.once("open", ()=>res()); ws.once("error", rej); });
  await join(ws, CHANNEL);
  const root: Node = await call(ws, "get_node_info", { nodeId: NODE_ID });
  if (!root) throw new Error("Node not found");

  const styles: string[] = [];
  const body = renderNode(root, styles, 2);
  
  const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(root.name||"Aerogrid Design")}</title>
  <link rel="stylesheet" href="./styles.css"/>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', Arial, sans-serif;
      margin: 0;
      background: #fff;
      color: #111;
      line-height: 1.6;
    }
    .root {
      max-width: 100%;
      margin: 0 auto;
      overflow-x: auto;
    }
    img {
      max-width: 100%;
      height: auto;
    }
    * {
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <main class="root">
${body}
  </main>
</body>
</html>`;

  const baseCss = `/* Generated from Figma node ${NODE_ID} - Aerogrid Design */
* { box-sizing: border-box; }
body { margin: 0; padding: 0; }
img { display: block; }
section { margin: 0; padding: 0; }

/* Responsive adjustments */
@media (max-width: 1200px) {
  .n_5125 { width: 100% !important; }
  .n_563, .n_1215, .n_559 { width: 100% !important; }
}

`;

  writeFileSync("test/index.html", html, "utf8");
  writeFileSync("test/styles.css", baseCss + styles.join("\n"), "utf8");
  console.log(`✅ Exported '${root.name}' (${NODE_ID}) to test/index.html + styles.css with dummy images`);
  ws.close();
}

main().catch(e=>{ console.error("❌ Error:", e); process.exit(1); });

