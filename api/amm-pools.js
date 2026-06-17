const CREST_GRAPHQL = "https://api.crestconomy.com/graphql";
const POOLS_QUERY = 'query CrestGql($path: String!) { api(method: "GET", path: $path) }';

export default async function handler(request, response) {
    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    response.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");

    if (request.method === "OPTIONS") {
        return response.status(204).end();
    }

    if (request.method !== "GET") {
        return response.status(405).json({ error: "Method not allowed" });
    }

    try {
        const upstream = await fetch(CREST_GRAPHQL, {
            method: "POST",
            headers: { "content-type": "application/json", accept: "*/*" },
            body: JSON.stringify({
                query: POOLS_QUERY,
                variables: { path: "/v1/amm/pools" }
            })
        });

        if (!upstream.ok) {
            return response.status(upstream.status).json({ error: "Upstream request failed" });
        }

        const payload = await upstream.json();
        return response.status(200).json({ pools: payload?.data?.api ?? [] });
    } catch (_) {
        return response.status(500).json({ error: "Failed to fetch AMM pools" });
    }
}
