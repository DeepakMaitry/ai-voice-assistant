require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const { VertexAI } = require('@google-cloud/vertexai');
const textToSpeech = require('@google-cloud/text-to-speech');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = 3000;

app.use(express.static('public'));

// ---------------------------------------------------------
// 1. SETUP PAID GOOGLE CLOUD VERTEX AI (Using Key File)
// ---------------------------------------------------------
const vertex_ai = new VertexAI({
    project: 'secure-medium-428315-a4',
    location: 'us-central1',
    googleAuthOptions: {
        keyFile: './google_key.json' 
    }
});

const model = "gemini-2.5-flash"; 
const generativeModel = vertex_ai.getGenerativeModel({
    model: model,
    systemInstruction: {
        role: 'system',
        parts: [{"text": "You are a helpful voice assistant. Keep your replies conversational and under 2 sentences."}]
    }
});

// ---------------------------------------------------------
// 2. SETUP VOICE BOX (Google Cloud TTS)
// ---------------------------------------------------------
const ttsClient = new textToSpeech.TextToSpeechClient({
    keyFilename: './google_key.json' 
});

async function generateAudio(text) {
    const request = {
        input: { text: text },
        voice: { languageCode: 'en-US', name: 'en-US-Journey-F' },
        audioConfig: { audioEncoding: 'MP3' },
    };
    const [response] = await ttsClient.synthesizeSpeech(request);
    return response.audioContent;
}

// ---------------------------------------------------------
// 3. THE REAL-TIME STREAMING ENGINE (With Speed Fix)
// ---------------------------------------------------------
io.on('connection', (socket) => {
    console.log('⚡ User connected');

    socket.on('user_message', async (data) => {
        const userText = data.message;
        console.log(`📩 User said: ${userText}`);

        try {
            // A. Start the Stream (Brain 1)
            const result = await generativeModel.generateContentStream({
                contents: [{ role: 'user', parts: [{ text: userText }] }],
            });

            let buffer = ""; 

            // B. Process stream
            for await (const item of result.stream) {
                if (item.candidates && item.candidates[0].content && item.candidates[0].content.parts) {
                    const chunkText = item.candidates[0].content.parts[0].text;
                    process.stdout.write(chunkText); // Print to terminal
                    buffer += chunkText;

                    // C. SPEED FIX: Check for full sentences OR Commas
                    // We look for: . ! ? ,
                    let sentenceEnd = buffer.search(/[.!?,]+/);

                    while (sentenceEnd !== -1) {
                        let sentence = buffer.substring(0, sentenceEnd + 1).trim();
                        buffer = buffer.substring(sentenceEnd + 1);

                        // Only speak if it's a real phrase (longer than 2 letters) to avoid glitches
                        if (sentence.length > 2) {
                            const audioContent = await generateAudio(sentence);
                            socket.emit('ai_audio_chunk', { 
                                text: sentence, 
                                audio: audioContent.toString('base64') 
                            });
                        }
                        sentenceEnd = buffer.search(/[.!?,]+/);
                    }
                }
            }

            // Leftovers (Whatever is left in the buffer at the end)
            if (buffer.trim().length > 0) {
                const audioContent = await generateAudio(buffer);
                socket.emit('ai_audio_chunk', { 
                    text: buffer, 
                    audio: audioContent.toString('base64') 
                });
            }

            socket.emit('ai_response_complete');
            console.log("\n✅ Done.");

        } catch (error) {
            console.error('❌ Error:', error);
        }
    });
});

server.listen(port, () => {
    console.log(`🚀 Vertex AI Streaming Server running at http://localhost:${port}`);
});