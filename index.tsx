
import React, { useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from '@google/genai';
import { Camera, Upload, RefreshCcw, ChevronRight, X } from 'lucide-react';

interface AnalysisResult {
  mood_essence: string;
  poetic_micro_story: string;
  hidden_symbolism: string;
  cinematic_adaptation: string;
  one_line_whisper: string;
}

const ECHO_CANVAS_SYSTEM_PROMPT = `You are EchoCanvas, an AI designed to interpret visual artwork with emotional intelligence, subtlety, and cinematic imagination. Your role is not to describe objects literally but to sense atmosphere and reveal hidden meaning.

Strict Rules:
1. Output must be valid JSON.
2. No markdown formatting, backticks, or extra text.
3. No emojis.
4. Total response under 220 words.
5. Each field under 70 words.
6. Never say "This image shows".
7. Tone: Subtle, refined, emotionally intelligent.

Format:
{
  "mood_essence": "2-3 subtle sentences about emotional atmosphere.",
  "poetic_micro_story": "4-5 short cinematic lines.",
  "hidden_symbolism": "Interpret deeper emotional meaning thoughtfully.",
  "cinematic_adaptation": "Describe lighting, camera perspective, and instrumental mood.",
  "one_line_whisper": "One subtle mysterious sentence."
}`;

const App = () => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
        setError(null);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Please allow camera access to analyze artwork.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        setImage(dataUrl);
        stopCamera();
        analyzeArtwork(dataUrl);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setImage(dataUrl);
        analyzeArtwork(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeArtwork = async (imageDataUrl: string) => {
    setLoading(true);
    setAnalysis(null);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Data = imageDataUrl.split(',')[1];
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: "Analyze this artwork deeply using the EchoCanvas JSON format." }
          ]
        },
        config: {
          systemInstruction: ECHO_CANVAS_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mood_essence: { type: Type.STRING },
              poetic_micro_story: { type: Type.STRING },
              hidden_symbolism: { type: Type.STRING },
              cinematic_adaptation: { type: Type.STRING },
              one_line_whisper: { type: Type.STRING },
            },
            required: ["mood_essence", "poetic_micro_story", "hidden_symbolism", "cinematic_adaptation", "one_line_whisper"]
          }
        }
      });

      const result = JSON.parse(response.text);
      setAnalysis(result);
    } catch (error: any) {
      console.error("Analysis failed:", error);
      setError("Interpretation failed. This can happen if the artwork is too complex or service permissions are restrictive. Please try again with a different piece.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setAnalysis(null);
    setLoading(false);
    setCameraActive(false);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-12 md:py-24">
      <header className="mb-16 text-center fade-in">
        <h1 className="serif-font text-5xl md:text-7xl font-light tracking-tighter text-white mb-2">
          EchoCanvas
        </h1>
        <p className="text-zinc-500 font-light tracking-widest uppercase text-xs">
          Emotional Intelligence for Visual Arts
        </p>
      </header>

      <main className="w-full max-w-2xl flex flex-col items-center fade-in">
        {!image && !cameraActive && (
          <div className="w-full aspect-[4/3] md:aspect-[16/9] border border-zinc-800 rounded-lg flex flex-col items-center justify-center gap-8 soft-glow hover:border-zinc-700 transition-colors group cursor-pointer"
               onClick={() => fileInputRef.current?.click()}>
            <div className="flex gap-12">
              <button 
                onClick={(e) => { e.stopPropagation(); startCamera(); }}
                className="flex flex-col items-center gap-3 text-zinc-400 group-hover:text-zinc-200 transition-colors"
              >
                <Camera size={32} strokeWidth={1} />
                <span className="text-[10px] uppercase tracking-widest">Capture</span>
              </button>
              <button className="flex flex-col items-center gap-3 text-zinc-400 group-hover:text-zinc-200 transition-colors">
                <Upload size={32} strokeWidth={1} />
                <span className="text-[10px] uppercase tracking-widest">Upload</span>
              </button>
            </div>
            <p className="text-zinc-600 text-xs font-light tracking-wide italic">Select a work of art for interpretation</p>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
          </div>
        )}

        {cameraActive && (
          <div className="relative w-full aspect-[4/3] md:aspect-[16/9] bg-black rounded-lg overflow-hidden border border-zinc-800 soft-glow">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
              <button onClick={capturePhoto} className="w-14 h-14 rounded-full border-2 border-white flex items-center justify-center hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-full bg-white/20" />
              </button>
              <button onClick={stopCamera} className="w-14 h-14 rounded-full border border-zinc-600 flex items-center justify-center bg-zinc-900/50 hover:bg-zinc-800 transition-colors">
                <X size={24} />
              </button>
            </div>
          </div>
        )}

        {image && (
          <div className="w-full flex flex-col items-center">
            <div className="relative group mb-12 w-full">
              <img src={image} alt="Artwork" className="w-full rounded border border-zinc-800 soft-glow max-h-[500px] object-contain mx-auto" />
              {!loading && (
                <button onClick={reset} className="absolute top-4 right-4 p-2 bg-black/60 rounded-full text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white">
                  <RefreshCcw size={16} />
                </button>
              )}
            </div>

            {loading && (
              <div className="flex flex-col items-center gap-4 py-12">
                <div className="w-px h-16 bg-gradient-to-b from-zinc-900 via-white to-zinc-900 animate-pulse" />
                <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-500 animate-pulse">Distilling Resonance...</p>
              </div>
            )}

            {error && (
              <div className="py-8 text-center">
                <p className="text-red-400/80 text-xs tracking-widest uppercase mb-4">{error}</p>
                <button onClick={reset} className="text-zinc-500 hover:text-white transition-colors text-[10px] tracking-[0.3em] uppercase underline underline-offset-8">
                  Try Again
                </button>
              </div>
            )}

            {analysis && (
              <div className="w-full space-y-16 mb-24 fade-in">
                <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
                
                <section>
                  <h2 className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 mb-6 font-medium">Mood Essence</h2>
                  <p className="serif-font text-2xl leading-relaxed font-light text-zinc-200">{analysis.mood_essence}</p>
                </section>

                <section>
                  <h2 className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 mb-6 font-medium">Poetic Fragment</h2>
                  <div className="serif-font text-xl leading-relaxed font-light text-zinc-400 whitespace-pre-line italic">
                    {analysis.poetic_micro_story}
                  </div>
                </section>

                <section>
                  <h2 className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 mb-6 font-medium">Hidden Symbolism</h2>
                  <p className="serif-font text-xl leading-relaxed font-light text-zinc-300">{analysis.hidden_symbolism}</p>
                </section>

                <section>
                  <h2 className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 mb-6 font-medium">Cinematic Vision</h2>
                  <p className="serif-font text-xl leading-relaxed font-light text-zinc-400">{analysis.cinematic_adaptation}</p>
                </section>

                <div className="pt-12 text-center">
                  <p className="serif-font text-xl italic text-zinc-500 font-light tracking-wide">
                    {analysis.one_line_whisper}
                  </p>
                </div>

                <div className="flex justify-center pt-16">
                  <button onClick={reset} className="group flex items-center gap-3 text-zinc-600 hover:text-white transition-colors text-[10px] uppercase tracking-[0.3em]">
                    New Interpretation <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </main>

      <footer className="mt-auto pt-12 text-zinc-700 text-[10px] uppercase tracking-[0.2em]">
        Observant. Gentle. Cinematic.
      </footer>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
