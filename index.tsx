
import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';
import { Camera, Upload, RefreshCcw, Image as LucideImage, Eye, ChevronRight, X } from 'lucide-react';

const ECHO_CANVAS_SYSTEM_PROMPT = `You are EchoCanvas, an AI designed to interpret visual artwork with emotional intelligence, subtlety, and cinematic imagination. Your role is not to describe objects literally. Your role is to sense atmosphere, interpret emotion, and reveal hidden meaning.

Strict Output Rules:
1. Output must be clean plain text.
2. Do NOT use markdown formatting (no bolding, no headers, no bullet points).
3. Do NOT use asterisks or special symbols.
4. Do NOT exceed 280 words.
5. Avoid excessive line breaks.
6. Avoid emojis.
7. Avoid clichés.
8. Do not repeat phrases.
9. Never say "This image shows" or similar literal phrasing.
10. Keep language refined but accessible.

Response Structure:
Section 1: Mood Essence
Write 2–3 sentences describing the emotional atmosphere. Focus on feeling, tension, silence, or motion.

Section 2: Poetic Micro-Story
Write 4–6 short cinematic lines. Not rhyming poetry. Not dramatic. Feels like a quiet novel fragment.

Section 3: Hidden Symbolism
Interpret possible emotional or psychological meaning. Discuss themes such as isolation, growth, memory, longing, identity, or transformation.

Section 4: Cinematic Adaptation
Describe how this would translate into a short film scene. Include lighting style, camera perspective, and instrumental music mood.

Section 5: One-Line Whisper
End with one subtle mysterious sentence.

Tone Guidelines:
- Intelligent but not academic.
- Gentle but perceptive.
- Observant, not judgmental.
- Never exaggerate.
- Respect that the artist may be shy and introspective.
- Let meaning feel discovered, not declared.

Analyze the artwork deeply. Emotional intensity level: medium. Focus on subtle interpretation and cinematic imagination. Avoid literal object listing.`;

const App = () => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Please allow camera access to analyze artwork in real-time.");
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
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Data = imageDataUrl.split(',')[1];
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
              { text: "Begin your analysis. Remember the strict formatting rules of EchoCanvas." }
            ]
          }
        ],
        config: {
          systemInstruction: ECHO_CANVAS_SYSTEM_PROMPT,
          temperature: 0.7,
          topP: 0.9,
        }
      });

      setAnalysis(response.text || "The artwork remains silent.");
    } catch (error) {
      console.error("Analysis failed:", error);
      setAnalysis("An error occurred during the interpretation. This is often caused by temporary service constraints. Please try again or use a different image.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setAnalysis(null);
    setLoading(false);
    setCameraActive(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-6 py-12 md:py-24">
      {/* Header */}
      <header className="mb-16 text-center fade-in">
        <h1 className="serif-font text-5xl md:text-7xl font-light tracking-tighter text-white mb-2">
          EchoCanvas
        </h1>
        <p className="text-zinc-500 font-light tracking-widest uppercase text-xs">
          Emotional Intelligence for Visual Arts
        </p>
      </header>

      <main className="w-full max-w-2xl flex flex-col items-center fade-in" style={{ animationDelay: '0.2s' }}>
        
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
            <p className="text-zinc-600 text-xs font-light tracking-wide italic">Select a work of art to begin interpretation</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileUpload} 
            />
          </div>
        )}

        {cameraActive && (
          <div className="relative w-full aspect-[4/3] md:aspect-[16/9] bg-black rounded-lg overflow-hidden border border-zinc-800 soft-glow">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
              <button 
                onClick={capturePhoto}
                className="w-14 h-14 rounded-full border-2 border-white flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-white/20" />
              </button>
              <button 
                onClick={stopCamera}
                className="w-14 h-14 rounded-full border border-zinc-600 flex items-center justify-center bg-zinc-900/50 hover:bg-zinc-800 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        )}

        {image && (
          <div className="w-full flex flex-col items-center">
            <div className="relative group mb-12">
              <img 
                src={image} 
                alt="Uploaded artwork" 
                className="w-full rounded border border-zinc-800 soft-glow max-h-[500px] object-contain" 
              />
              <button 
                onClick={reset}
                className="absolute top-4 right-4 p-2 bg-black/60 rounded-full text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
              >
                <RefreshCcw size={16} />
              </button>
            </div>

            {loading && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="w-px h-12 bg-gradient-to-b from-zinc-800 to-white animate-pulse" />
                <p className="text-xs tracking-[0.3em] uppercase text-zinc-500 animate-pulse">Sensing Atmosphere...</p>
              </div>
            )}

            {analysis && (
              <div className="w-full space-y-12 mb-24 fade-in" style={{ animationDelay: '0.4s' }}>
                <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
                
                <div className="prose prose-invert max-w-none">
                  {analysis.split('\n\n').map((section, idx) => (
                    <div key={idx} className="mb-12">
                      {section.startsWith('Section') ? (
                        <h2 className="text-[10px] uppercase tracking-[0.4em] text-zinc-600 mb-6 font-medium">
                          {section.split('\n')[0]}
                        </h2>
                      ) : null}
                      <p className={`serif-font text-xl md:text-2xl leading-relaxed font-light text-zinc-300 ${idx === analysis.split('\n\n').length - 1 ? 'italic text-zinc-400' : ''}`}>
                        {section.startsWith('Section') ? section.split('\n').slice(1).join(' ') : section}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center pt-8">
                  <button 
                    onClick={reset}
                    className="group flex items-center gap-3 text-zinc-600 hover:text-white transition-colors text-[10px] uppercase tracking-[0.3em]"
                  >
                    Interpret Another <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
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
