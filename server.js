// server.js — FINAL GUARANTEED VERSION (AI STUDIO COMPATIBLE)

require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY missing");
  process.exit(1);
}

// ✅ CORRECT ENDPOINT + MODEL FOR AI STUDIO
// ✅ UPDATED: Using gemini-2.5-flash for faster voice response
// Trying the 'latest' alias often fixes the 404 error
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

app.post("/chat", async (req, res) => {
  try {
    const userText = req.body.message;

    if (!userText || userText.trim() === "") {
      return res.json({ reply: "I didn’t hear anything." });
    }

    const response = await fetch(
      `${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are a friendly, calm, human-like female voice assistant.
Reply naturally and politely.

User said: ${userText}`
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]) {
      console.error("❌ Gemini API error:", data);
      return res.json({
        reply: "Sorry, I am having trouble responding right now."
      });
    }

    const reply =
      data.candidates[0].content.parts[0].text;

    res.json({ reply });

  } catch (error) {
    console.error("❌ Server error:", error);
    res.json({
      reply: "Sorry, I am having trouble responding right now."
    });
  }
});

app.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});
