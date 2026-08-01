/**
 * Cloudflare Pages Functions — 同步接口（/sync）
 *
 * 设计原则：
 *  - 本 Worker 是「哑存储」：它只负责校验令牌、把客户端发来的「密文」原样存进 KV、
 *    再把 KV 里的密文原样返回。它永远看不到明文，也不需要任何解密逻辑。
 *  - 所有合并 / 冲突解决 / 加密都在浏览器端（js/sync.js）完成。
 *  - KV 里只有一个 key（stella:archive），存「整包加密 blob」。
 *
 * 部署前在 Cloudflare Pages 后台设置：
 *  - Settings → Functions → KV namespace bindings：绑定名 STELLA_KV
 *  - Settings → Environment variables：SYNC_TOKEN（一串你自己生成的随机串，
 *    需与 js/sync.js 里的 SYNC_TOKEN 保持一致；若两边都留空则不校验令牌，
 *    但数据依然端到端加密，仅少一层访问控制）
 */

const KV_KEY = "stella:archive";

export async function onRequest(context) {
  const { request, env } = context;

  // ---- 令牌校验 ----
  const url = new URL(request.url);
  const token =
    url.searchParams.get("t") ||
    request.headers.get("x-sync-token") ||
    "";
  if (env.SYNC_TOKEN && token !== env.SYNC_TOKEN) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const kv = env.STELLA_KV;
  if (!kv) {
    return new Response(JSON.stringify({ error: "KV not bound" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  // ---- GET：返回云端密文（空则 204）----
  if (request.method === "GET") {
    const val = await kv.get(KV_KEY);
    if (!val) return new Response("", { status: 204 });
    return new Response(val, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  }

  // ---- POST：写入密文 ----
  if (request.method === "POST") {
    const body = await request.text();
    if (!body || body.trim() === "") {
      return new Response(JSON.stringify({ error: "empty body" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    await kv.put(KV_KEY, body);
    return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response("method not allowed", { status: 405 });
}
