require("dotenv").config();
const fs = require("fs");

const API_KEY = process.env.GEMINI_API_KEY;
// Using the special TTS model from your list
const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${API_KEY}`;

async function testVoice() {
  console.log("🎙️  Requesting REALISTIC audio from Gemini...");

  try {
    const response = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: "Hi there! This is my new, human-realistic voice. How does it sound?" }]
          }
        ],
        // ✅ CORRECTED: This must be inside generationConfig
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Aoede" // Options: "Aoede", "Charon", "Fenrir", "Kore", "Leto"
              }
            }
          }
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("❌ API Error:", JSON.stringify(data.error, null, 2));
      return;
    }

    // Gemini returns audio inside the first candidate
    const candidate = data.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find(p => p.inlineData);

    if (audioPart) {
      console.log("✅ Success! Audio received.");
      const buffer = Buffer.from(audioPart.inlineData.data, "base64");
      fs.writeFileSync("test_output.wav", buffer);
      console.log("💾 Saved to 'test_output.wav'. Go play it!");
    } else {
      console.log("⚠️ No audio found. Raw response:", JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error("❌ Network error:", error);
  }
}

testVoice();