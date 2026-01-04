require("dotenv").config();
const express = require("express");

const app = express();
app.use(express.json());
app.use(express.static("public"));

app.post("/chat", async (req, res) => {
  try {
    const userText = req.body.message;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a friendly AI voice assistant. Reply shortly." },
          { role: "user", content: userText }
        ]
      })
    });

    const data = await response.json();

    // 🔥 VERY IMPORTANT CHECK
    if (!data.choices) {
      console.log("OpenAI error:", data);
      return res.json({ reply: "Sorry, I am having trouble responding right now." });
    }

    res.json({ reply: data.choices[0].message.content });

  } catch (error) {
    console.error(error);
    res.json({ reply: "Server error occurred." });
  }
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
