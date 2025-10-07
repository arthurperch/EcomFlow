const OLLAMA_URL = "http://localhost:11434/api/generate"; // ensure Ollama running
const MODEL = "llama3.1:8b"; // or any local model you prefer
export async function optimizeForEbay(p) {
    const prompt = `You are an expert eBay SEO copywriter. Optimize a title (max 80 chars) and HTML description for a product.\n\nSource Title: ${p.title}\nBullets: ${p.bullets.join(" | ")}\nDescription: ${p.description.slice(0, 2000)}\nImportant: Keep title <= 80 chars, no emojis, no forbidden terms. Include key attributes (size, color, count).\nReturn JSON with fields: ebayTitle, ebayHtmlDescription, keywords (array).`;
    const body = { model: MODEL, prompt, stream: false };
    const res = await fetch(OLLAMA_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok)
        throw new Error("LLM request failed");
    const data = await res.json();
    // Ollama returns {response: string}
    const text = data.response?.trim() || "";
    const json = safeJson(text);
    if (!json?.ebayTitle || !json?.ebayHtmlDescription)
        throw new Error("Bad LLM output");
    return json;
}
function safeJson(t) {
    try {
        const start = t.indexOf('{');
        const end = t.lastIndexOf('}');
        if (start >= 0 && end > start)
            return JSON.parse(t.slice(start, end + 1));
    }
    catch { }
    return null;
}
