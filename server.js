require("dotenv").config();
const express = require("express");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.post("/chat", async (req, res) => {
  try {
    const userText = req.body.message;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: userText }],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!data.candidates || !data.candidates[0]) {
      console.log("Gemini error:", data);
      return res.json({
        reply: "Sorry, I am having trouble responding right now.",
      });
    }

    const replyText = data.candidates[0].content.parts[0].text;
    res.json({ reply: replyText });

  } catch (error) {
    console.error(error);
    res.json({ reply: "Server error occurred." });
  }
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
