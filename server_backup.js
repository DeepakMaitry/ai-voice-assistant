require("dotenv").config();
const express = require("express");
const path = require("path");
const { VertexAI } = require("@google-cloud/vertexai");
const textToSpeech = require('@google-cloud/text-to-speech');

// 🛑 STOP: Replace this with your ACTUAL Project ID from the json file
const PROJECT_ID = "secure-medium-428315-a4"; 

// 🔑 THE FIX: We force the environment variable to point to your key file
// This tells the "Security Guard" exactly where your ID badge is.
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, "google_key.json");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const LOCATION = "us-central1"; 

// Initialize Vertex AI
const vertex_ai = new VertexAI({
  project: PROJECT_ID,
  location: LOCATION
});

// Use the standard "auto-updating" model name
const generativeModel = vertex_ai.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: {
        role: 'system',
        parts: [{"text": "You are a helpful voice assistant. Keep your replies very short, concise, and conversational (under 3 sentences). Do not use bullet points or special formatting."}]
    }
});

// Initialize Text-to-Speech
const ttsClient = new textToSpeech.TextToSpeechClient();

// --- HELPER: WAV Header ---
function addWavHeader(pcmData, sampleRate = 24000, numChannels = 1, bitDepth = 16) {
  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = pcmData.length;
  const fileSize = 36 + dataSize;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(fileSize, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22); header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28); header.writeUInt16LE(blockAlign, 32); header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36); header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmData]);
}

app.post("/chat", async (req, res) => {
  try {
    const userText = req.body.message;
    console.log("📩 User said:", userText);

    // --- STEP 1: THINK (Vertex AI) ---
    const textRequest = {
      contents: [{ role: "user", parts: [{ text: `You are a conversational assistant. User said: "${userText}". Reply naturally in 1 sentence.` }] }],
    };
    
    const textResult = await generativeModel.generateContent(textRequest);
    const aiReply = textResult.response.candidates[0].content.parts[0].text;
    console.log("💡 AI Thought:", aiReply);

    // --- STEP 2: SPEAK (Cloud TTS) ---
    const [audioResponse] = await ttsClient.synthesizeSpeech({
      input: { text: aiReply },
      voice: { languageCode: 'en-US', name: 'en-US-Journey-F' },
      audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000 },
    });

    console.log("✅ Audio generated (Cloud TTS).");
    const wavBuffer = addWavHeader(audioResponse.audioContent, 24000);
    res.json({ audio: wavBuffer.toString("base64") });

  } catch (error) {
    console.error("❌ Error:", error);
    res.json({ error: "Server error" });
  }
});

app.listen(3000, () => {
  console.log("🚀 Vertex AI Server running at http://localhost:3000");
});