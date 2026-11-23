#!/usr/bin/env node
/**
 * NS홈쇼핑 MCP 서버 (Claude 플러그인용, stdio, 외부 의존성 없음)
 *
 * ChatGPT App(챗gpt/src/mcp.ts)의 툴 3종을 Claude Code용으로 옮긴 버전입니다.
 *   - get_broadcast_schedule : mapi.nsmall.com 편성표 공개 API (실데이터)
 *   - search_products        : 편성표 방송 상품에서 키워드 검색 + m.nsmall.com 검색 링크
 *   - get_product_detail     : 편성표에서 상품코드로 가격/혜택 조회 + 상세 링크
 *
 * 프로토콜: MCP (JSON-RPC 2.0, 줄 단위 stdio). Node.js 18+ (내장 fetch) 필요.
 */
import { createInterface } from "node:readline";

// ---------------------------------------------------------------- 설정
const env = process.env;
const SCHEDULE_API = (env.NSMALL_SCHEDULE_API_BASE_URL ?? "https://mapi.nsmall.com/md/api/v1/display/media/schedule").replace(/\/+$/, "");
const IMAGE_BASE = env.NSMALL_PRODUCT_IMAGE_BASE_URL ?? "https://product-image.prod-nsmall.com";
const TIMEOUT_MS = Number(env.NSMALL_API_TIMEOUT_MS ?? 8000);
const SITE = "https://m.nsmall.com";
const MAX_PRODUCTS_PER_SLOT = 5;

const CHANNELS = {
  TV: { label: "NS홈쇼핑 TV", api: "tv", page: `${SITE}/store/fixed/schedule/tv` },
  PLUS: { label: "TV Shop+", api: "shopplus", page: `${SITE}/store/fixed/schedule/shop-plus` },
  LIVE: { label: "N라이브", api: null, page: `${SITE}/store/fixed/schedule/nlive` },
};
const STATUS = { A: "live", B: "upcoming", C: "past" };

// ---------------------------------------------------------------- 유틸
const won = (n) => `${Number(n).toLocaleString("ko-KR")}원`;
const productUrl = (id) => `${SITE}/goods/${encodeURIComponent(id)}`;
const searchUrl = (q) => `${SITE}/search/${encodeURIComponent(q)}`;
const imageUrl = (id, url) => (url ? url.replace(/^http:\/\//, "https://") : `${IMAGE_BASE}/new/${id}_0.jpg`);

/** KST 기준 YYYY-MM-DD (offsetDays 만큼 이동) */
function kstDate(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(d);
}
/** YYYYMMDDHHmmss → HH:mm */
const hhmm = (s) => `${s.slice(8, 10)}:${s.slice(10, 12)}`;

function priceText(p) {
  return p.salePrice != null && p.salePrice < p.price
    ? `${won(p.salePrice)} (정상가 ${won(p.price)}, ${Math.round((1 - p.salePrice / p.price) * 100)}% 할인)`
    : won(p.price);
}

/** 편성표 API의 goods 객체 → Product. 상품가 = dcPrice(할인 반영), salePrice는 할인 전 정상가 */
function toProduct(goodsCd, g, img) {
  const id = String(g?.goodsCd ?? goodsCd ?? "");
  if (!id || !g?.productNm) return null;
  const dc = Number(g.dcPrice ?? g.salePrice ?? 0);
  const list = Number(g.salePrice ?? dc);
  const benefit = g.headCopyInfo?.hdcpNm ?? g.headCopy;
  return {
    id,
    name: String(g.productNm).replace(/\s+/g, " ").trim(),
    brand: g.brandNm || undefined,
    price: Math.max(list, dc),
    salePrice: dc && dc < list ? dc : undefined,
    benefit: typeof benefit === "string" && benefit ? benefit : undefined,
    url: productUrl(id),
    imageUrl: imageUrl(id, img),
  };
}

// ---------------------------------------------------------------- 편성표 API
const cache = new Map(); // key: channel|ymd → { at, items }
const CACHE_MS = 60_000;

async function fetchChannel(channel, ymd) {
  const ch = CHANNELS[channel];
  if (!ch?.api) return [];
  const key = `${channel}|${ymd}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.items;

  const url = `${SCHEDULE_API}/${ch.api}/${ymd}`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`편성표 API 오류 ${res.status} (${ch.label})`);
  const body = await res.json();
  const rows = body?.data?.resultData?.totalOrgan ?? [];

  const items = rows
    .filter((r) => r?.startDtm && r?.endDtm)
    .map((r) => {
      const seen = new Set();
      const products = [];
      const add = (p) => {
        if (p && !seen.has(p.id) && products.length < MAX_PRODUCTS_PER_SLOT) {
          seen.add(p.id);
          products.push(p);
        }
      };
      add(toProduct(r.goodsCd, r.goods));
      for (const rel of r.relTotalOrgan ?? []) add(toProduct(rel?.goodsCd, rel?.goods, rel?.imageUrl));
      return {
        channel,
        start: String(r.startDtm),
        end: String(r.endDtm),
        title: r.pgmNm ?? "",
        status: STATUS[r.liveCd] ?? "upcoming",
        products,
      };
    });
  cache.set(key, { at: Date.now(), items });
  return items;
}

async function fetchSchedule(date, channel) {
  const ymd = date.replaceAll("-", "");
  const channels = channel ? [channel] : ["TV", "PLUS"];
  const settled = await Promise.allSettled(channels.map((c) => fetchChannel(c, ymd)));
  const errors = settled.filter((s) => s.status === "rejected").map((s) => s.reason?.message ?? String(s.reason));
  const items = settled
    .filter((s) => s.status === "fulfilled")
    .flatMap((s) => s.value)
    .sort((a, b) => a.start.localeCompare(b.start));
  return { items, errors };
}

/** 어제~모레 편성 상품 전체 (검색/상세 조회용) */
async function recentBroadcastProducts() {
  const dates = [-1, 0, 1, 2].map(kstDate);
  const results = await Promise.all(dates.map((d) => fetchSchedule(d)));
  const map = new Map();
  for (const { items } of results)
    for (const b of items)
      for (const p of b.products) {
        const prev = map.get(p.id);
        const slot = { channel: b.channel, start: b.start, end: b.end, status: b.status, title: b.title };
        if (prev) prev.slots.push(slot);
        else map.set(p.id, { ...p, slots: [slot] });
      }
  return [...map.values()];
}

const slotText = (s) =>
  `${s.start.slice(4, 6)}/${s.start.slice(6, 8)} ${hhmm(s.start)}~${hhmm(s.end)} ${CHANNELS[s.channel].label}` +
  (s.status === "live" ? " [방송중]" : s.status === "past" ? " [지난방송]" : "");

// ---------------------------------------------------------------- 툴 정의
const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

const TOOLS = [
  {
    name: "get_broadcast_schedule",
    title: "NS홈쇼핑 방송 편성표",
    description:
      "NS홈쇼핑 TV / TV Shop+ 방송 편성표와 방송 상품(상품명, 판매가, 할인, 혜택, 상품코드, 링크)을 조회합니다. " +
      "'오늘 NS홈쇼핑 뭐 팔아?', '지금 방송 중인 상품', '내일 저녁 편성' 같은 질문에 사용하세요. N라이브(LIVE)는 데이터가 없어 링크만 제공합니다.",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$", description: "조회 날짜 YYYY-MM-DD (생략 시 오늘, 한국시간)" },
        channel: { type: "string", enum: ["TV", "PLUS", "LIVE"], description: "TV(NS홈쇼핑 TV), PLUS(TV Shop+), LIVE(N라이브). 생략 시 TV+PLUS" },
        status: { type: "string", enum: ["live", "upcoming", "past", "all"], description: "방송 상태 필터 (기본 all). '지금 방송 중'이면 live" },
        fromHour: { type: "integer", minimum: 0, maximum: 23, description: "이 시각(시, KST) 이후 시작하는 방송만" },
        toHour: { type: "integer", minimum: 1, maximum: 24, description: "이 시각(시, KST) 이전에 시작하는 방송만" },
      },
      additionalProperties: false,
    },
    annotations: readOnly,
    handler: async ({ date, channel, status = "all", fromHour, toHour }) => {
      const d = date ?? kstDate();
      if (channel === "LIVE") {
        return `N라이브 편성표는 데이터를 제공하지 않습니다. 공식 편성표에서 확인해 주세요: ${CHANNELS.LIVE.page}`;
      }
      const { items, errors } = await fetchSchedule(d, channel);
      const filtered = items.filter((b) => {
        const h = Number(b.start.slice(8, 10));
        return (
          (status === "all" || b.status === status) &&
          (fromHour == null || h >= fromHour) &&
          (toHour == null || h < toHour)
        );
      });
      const ymd = d.replaceAll("-", "");
      const pages = (channel ? [channel] : ["TV", "PLUS"]).map((c) => `${CHANNELS[c].label}: ${CHANNELS[c].page}/${ymd}`);
      const lines = filtered.map((b) => {
        const tag = b.status === "live" ? " [방송중]" : b.status === "past" ? " [지난방송]" : "";
        const prods = b.products
          .map((p) => `    · ${p.name} | ${priceText(p)}${p.benefit ? ` | ${p.benefit}` : ""} | 상품코드 ${p.id} | ${p.url}`)
          .join("\n");
        return `- ${hhmm(b.start)}~${hhmm(b.end)} [${CHANNELS[b.channel].label}] ${b.title}${tag}\n${prods}`;
      });
      return [
        filtered.length ? `${d} 편성표 (${filtered.length}건, 한국시간)` : `${d} 조건에 맞는 편성 정보가 없습니다.`,
        ...lines,
        errors.length ? `\n일부 채널 조회 실패: ${errors.join("; ")}` : "",
        `\n공식 편성표: ${pages.join(" / ")}`,
        "※ 가격과 혜택은 수시로 바뀝니다. 최종 정보는 m.nsmall.com에서 확인하도록 안내하세요.",
      ]
        .filter(Boolean)
        .join("\n");
    },
  },
  {
    name: "search_products",
    title: "NS홈쇼핑 상품 검색",
    description:
      "NS홈쇼핑 상품을 키워드로 찾습니다. 어제~모레 방송 편성 상품 중 키워드와 가격 조건에 맞는 상품(실제 판매가, 상품코드, 링크)과 " +
      "m.nsmall.com 검색 결과 링크를 돌려줍니다. 방송 상품이 아닌 일반 상품은 검색 링크로 안내하세요.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", minLength: 1, description: "검색 키워드 (예: '한우', '청소기', '패딩')" },
        minPrice: { type: "integer", minimum: 0, description: "최소 판매가(원)" },
        maxPrice: { type: "integer", minimum: 0, description: "최대 판매가(원)" },
        sort: { type: "string", enum: ["relevance", "priceAsc", "priceDesc", "soon"], description: "정렬: 관련도/낮은가격/높은가격/방송임박순 (기본 relevance)" },
        limit: { type: "integer", minimum: 1, maximum: 20, description: "최대 결과 수 (기본 10)" },
      },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: readOnly,
    handler: async ({ query, minPrice, maxPrice, sort = "relevance", limit = 10 }) => {
      const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      const all = await recentBroadcastProducts();
      const sell = (p) => p.salePrice ?? p.price;
      const now = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul", hour12: false })
        .format(new Date())
        .replace(/\D/g, "");
      const nextSlot = (p) => p.slots.map((s) => s.end).filter((e) => e >= now).sort()[0] ?? "99999999999999";

      let hits = all
        .map((p) => {
          const hay = `${p.name} ${p.brand ?? ""} ${p.slots.map((s) => s.title).join(" ")}`.toLowerCase();
          const score = terms.filter((t) => hay.includes(t)).length;
          return { p, score };
        })
        .filter(({ p, score }) => score > 0 && (minPrice == null || sell(p) >= minPrice) && (maxPrice == null || sell(p) <= maxPrice));

      const cmp = {
        relevance: (a, b) => b.score - a.score || nextSlot(a.p).localeCompare(nextSlot(b.p)),
        priceAsc: (a, b) => sell(a.p) - sell(b.p),
        priceDesc: (a, b) => sell(b.p) - sell(a.p),
        soon: (a, b) => nextSlot(a.p).localeCompare(nextSlot(b.p)),
      }[sort];
      hits = hits.sort(cmp).slice(0, limit);

      const link = searchUrl(query);
      if (!hits.length) {
        return [
          `'${query}'와 일치하는 최근 방송 상품이 없습니다.`,
          `NS홈쇼핑 검색 결과에서 바로 확인하도록 안내하세요: ${link}`,
          "필요하면 WebSearch로 `site:m.nsmall.com/goods " + query + "` 를 검색해 nsmall.com 결과만 사용하세요.",
        ].join("\n");
      }
      return [
        `'${query}' 방송 상품 ${hits.length}건 (어제~모레 편성 기준):`,
        ...hits.map(
          ({ p }, i) =>
            `${i + 1}. ${p.name} | ${priceText(p)}${p.benefit ? ` | ${p.benefit}` : ""} | 상품코드 ${p.id} | ${p.url}\n   방송: ${p.slots.map(slotText).join(", ")}`,
        ),
        `\n전체 검색 결과: ${link}`,
        "※ 위 목록은 방송 상품만 포함합니다. 최종 가격과 혜택은 m.nsmall.com에서 확인하도록 안내하세요.",
      ].join("\n");
    },
  },
  {
    name: "get_product_detail",
    title: "NS홈쇼핑 상품 상세",
    description:
      "NS홈쇼핑 상품코드로 판매가, 정상가/할인율, 혜택, 방송 일정, 상세 링크를 조회합니다. " +
      "search_products 또는 get_broadcast_schedule 결과의 상품코드를 사용하세요. 상품코드를 지어내지 마세요.",
    inputSchema: {
      type: "object",
      properties: { productId: { type: "string", pattern: "^\\d+$", description: "NS홈쇼핑 상품코드 (숫자)" } },
      required: ["productId"],
      additionalProperties: false,
    },
    annotations: readOnly,
    handler: async ({ productId }) => {
      const p = (await recentBroadcastProducts()).find((x) => x.id === String(productId));
      if (!p) {
        return [
          `상품코드 ${productId}는 최근 방송 편성에 없어 가격 정보를 확인하지 못했습니다.`,
          `상세 페이지에서 확인하도록 안내하세요: ${productUrl(productId)}`,
          "가격, 혜택, 배송 정보를 추측하지 마세요.",
        ].join("\n");
      }
      return [
        `${p.name}${p.brand ? ` (${p.brand})` : ""}`,
        `상품코드: ${p.id}`,
        `판매가: ${priceText(p)}`,
        p.benefit ? `혜택: ${p.benefit}` : "",
        `방송: ${p.slots.map(slotText).join(", ")}`,
        `이미지: ${p.imageUrl}`,
        `상세 링크: ${p.url}`,
        "※ 최종 가격과 혜택은 m.nsmall.com에서 확인하도록 안내하세요.",
      ]
        .filter(Boolean)
        .join("\n");
    },
  },
];

// ---------------------------------------------------------------- MCP / JSON-RPC (stdio)
const SERVER_INFO = { name: "nsmall", title: "NS홈쇼핑", version: "0.2.3" };
const SUPPORTED = ["2025-06-18", "2025-03-26", "2024-11-05"];

const send = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");
const reply = (id, result) => send({ jsonrpc: "2.0", id, result });
const fail = (id, code, message) => send({ jsonrpc: "2.0", id, error: { code, message } });

async function handle(msg) {
  const { id, method, params } = msg;
  const isRequest = id !== undefined && id !== null;
  switch (method) {
    case "initialize": {
      const v = params?.protocolVersion;
      return reply(id, {
        protocolVersion: SUPPORTED.includes(v) ? v : SUPPORTED[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          "NS홈쇼핑(m.nsmall.com) 방송 편성표와 방송 상품 정보를 조회합니다. 정보 조회 전용이며 주문/결제는 하지 않습니다.",
      });
    }
    case "ping":
      return reply(id, {});
    case "tools/list":
      return reply(id, { tools: TOOLS.map(({ handler, ...t }) => t) });
    case "tools/call": {
      const tool = TOOLS.find((t) => t.name === params?.name);
      if (!tool) return fail(id, -32602, `알 수 없는 툴: ${params?.name}`);
      try {
        const text = await tool.handler(params?.arguments ?? {});
        return reply(id, { content: [{ type: "text", text }] });
      } catch (e) {
        const reason = e?.name === "TimeoutError" ? "응답 시간 초과" : e?.message ?? String(e);
        return reply(id, {
          isError: true,
          content: [{ type: "text", text: `NS홈쇼핑 데이터 조회 실패: ${reason}\n공식 편성표: ${CHANNELS.TV.page}` }],
        });
      }
    }
    default:
      if (isRequest) return fail(id, -32601, `지원하지 않는 메서드: ${method}`);
  }
}

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  if (!line.trim()) return;
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return fail(null, -32700, "Parse error");
  }
  for (const m of Array.isArray(msg) ? msg : [msg]) handle(m).catch((e) => fail(m.id ?? null, -32603, String(e)));
});
rl.on("close", () => process.exit(0));
