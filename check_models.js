require("dotenv").config();

const apiKey = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

console.log("🔍 Checking available models for your API Key...");

fetch(url)
  .then((response) => response.json())
  .then((data) => {
    if (data.error) {
      console.error("❌ API Error:", data.error.message);
    } else {
      console.log("✅ SUCCESS! Here are the valid model names for your key:");
      console.log("------------------------------------------------");
      // Filter for just the names to make it readable
      const names = data.models.map((m) => m.name.replace("models/", ""));
      console.log(names.join("\n"));
      console.log("------------------------------------------------");
    }
  })
  .catch((err) => console.error("❌ Network Error:", err));