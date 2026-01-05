// server.js — drop-in ready
require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Fetch wrapper: uses native fetch (Node 18+) if available,
// otherwise dynamically imports node-fetch.
async function fetchWrapper(...args) {
  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch(...args);
  }
  // dynamic import of node-fetch v3
  const { default: fetch } = await import("node-fetch");
  return fetch(...args);
}

app.post("/chat", async (req, res) => {
  try {
    const userText = req.body.message;
    if (!userText) return res.status(400).json({ reply: "No message provided." });

    const MODEL = "gemini-1.5-flash"; // recommended stable demo model
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const response = await fetchWrapper(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // simple request body — keep this minimal for demo
        contents: [
          {
            parts: [{ text: userText }]
          }
        ]
      })
    });

    // handle non-JSON or non-OK responses gracefully
    const data = await response.json().catch((e) => {
      console.error("Invalid JSON from Gemini:", e);
      return null;
    });

    if (!data || !data.candidates || !data.candidates[0]) {
      console.log("Gemini error response:", data);
      return res.status(502).json({ reply: "Sorry, I am having trouble responding right now." });
    }

    // join parts if model returns multiple parts
    const replyText = (data.candidates[0].content.parts || [])
      .map((p) => p.text || "")
      .join(" ")
      .trim();

    res.json({ reply: replyText || "Sorry, I couldn't form a reply." });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ reply: "Server error occurred." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
