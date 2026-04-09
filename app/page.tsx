"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// ── THE UNISON — Raycaster ─────────────────────────────────────

// 80x80 procedurally generated map with corridors, rooms, and branching paths
const MAP_W = 80;
const MAP_H = 80;
const MAP: number[] = [];

// Seeded random for consistent map generation
function seededRand(i: number): number {
  const x = Math.sin(42 * 9301 + i * 4973) * 49297;
  return x - Math.floor(x);
}

function generateMap() {
  // Fill with walls
  for (let i = 0; i < MAP_W * MAP_H; i++) MAP[i] = 1;

  const set = (x: number, y: number, v: number) => {
    if (x > 0 && x < MAP_W - 1 && y > 0 && y < MAP_H - 1) MAP[y * MAP_W + x] = v;
  };
  const get = (x: number, y: number): number => {
    if (x <= 0 || x >= MAP_W - 1 || y <= 0 || y >= MAP_H - 1) return 1;
    return MAP[y * MAP_W + x];
  };

  // Carve a corridor of given width (2-3 tiles)
  const carveH = (y: number, x1: number, x2: number, width: number) => {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    for (let x = minX; x <= maxX; x++) {
      for (let w = 0; w < width; w++) set(x, y + w, 0);
    }
  };
  const carveV = (x: number, y1: number, y2: number, width: number) => {
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    for (let y = minY; y <= maxY; y++) {
      for (let w = 0; w < width; w++) set(x + w, y, 0);
    }
  };

  // Carve a room (clear rectangular area)
  const carveRoom = (cx: number, cy: number, w: number, h: number) => {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        set(cx + dx, cy + dy, 0);
      }
    }
  };

  let seed = 0;
  const rnd = () => seededRand(seed++);
  const rndInt = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));

  // --- Step 1: Create a grid of rooms connected by corridors ---
  // Place rooms on a roughly 15-tile grid with jitter
  const rooms: { x: number; y: number; w: number; h: number }[] = [];

  for (let gy = 0; gy < 5; gy++) {
    for (let gx = 0; gx < 5; gx++) {
      const baseX = 3 + gx * 15;
      const baseY = 3 + gy * 15;
      const jx = rndInt(-2, 2);
      const jy = rndInt(-2, 2);
      const rx = Math.max(2, Math.min(MAP_W - 14, baseX + jx));
      const ry = Math.max(2, Math.min(MAP_H - 14, baseY + jy));
      // Some rooms are large (8-12), most are small (3-5)
      const isLarge = rnd() < 0.25;
      const rw = isLarge ? rndInt(8, 12) : rndInt(3, 5);
      const rh = isLarge ? rndInt(8, 12) : rndInt(3, 5);
      rooms.push({ x: rx, y: ry, w: rw, h: rh });
      carveRoom(rx, ry, rw, rh);
    }
  }

  // --- Step 2: Connect adjacent rooms with wide corridors ---
  for (let gy = 0; gy < 5; gy++) {
    for (let gx = 0; gx < 5; gx++) {
      const idx = gy * 5 + gx;
      const room = rooms[idx];
      const rcx = room.x + Math.floor(room.w / 2);
      const rcy = room.y + Math.floor(room.h / 2);

      // Connect to the room to the right
      if (gx < 4) {
        const right = rooms[idx + 1];
        const rcx2 = right.x + Math.floor(right.w / 2);
        const rcy2 = right.y + Math.floor(right.h / 2);
        const midX = Math.floor((rcx + rcx2) / 2);
        const cw = rndInt(2, 3);
        carveH(Math.min(rcy, rcy2), rcx, midX, cw);
        carveV(midX, Math.min(rcy, rcy2), Math.max(rcy, rcy2), cw);
        carveH(rcy2, midX, rcx2, cw);
      }
      // Connect to the room below
      if (gy < 4) {
        const below = rooms[idx + 5];
        const rcx2 = below.x + Math.floor(below.w / 2);
        const rcy2 = below.y + Math.floor(below.h / 2);
        const midY = Math.floor((rcy + rcy2) / 2);
        const cw = rndInt(2, 3);
        carveV(Math.min(rcx, rcx2), rcy, midY, cw);
        carveH(midY, Math.min(rcx, rcx2), Math.max(rcx, rcx2), cw);
        carveV(rcx2, midY, rcy2, cw);
      }
    }
  }

  // --- Step 3: Add long straight corridors that cut across the map ---
  // Horizontal corridors
  const hCorridors = [12, 28, 45, 60, 72];
  for (const y of hCorridors) {
    const startX = rndInt(2, 8);
    const endX = rndInt(MAP_W - 9, MAP_W - 3);
    const w = rndInt(2, 3);
    carveH(y, startX, endX, w);
  }
  // Vertical corridors
  const vCorridors = [10, 25, 42, 58, 70];
  for (const x of vCorridors) {
    const startY = rndInt(2, 8);
    const endY = rndInt(MAP_H - 9, MAP_H - 3);
    const w = rndInt(2, 3);
    carveV(x, startY, endY, w);
  }

  // --- Step 4: Add extra diagonal-ish connections to prevent dead ends ---
  for (let i = 0; i < 15; i++) {
    const x1 = rndInt(5, MAP_W - 10);
    const y1 = rndInt(5, MAP_H - 10);
    const x2 = x1 + rndInt(8, 20);
    const y2 = y1 + rndInt(-5, 5);
    const cw = rndInt(2, 3);
    const midX = Math.floor((x1 + Math.min(x2, MAP_W - 3)) / 2);
    const clampedX2 = Math.min(x2, MAP_W - 3);
    const clampedY2 = Math.max(2, Math.min(y2, MAP_H - 3));
    carveH(y1, x1, midX, cw);
    carveV(midX, Math.min(y1, clampedY2), Math.max(y1, clampedY2), cw);
    carveH(clampedY2, midX, clampedX2, cw);
  }

  // --- Step 5: Ensure borders are walls ---
  for (let x = 0; x < MAP_W; x++) {
    MAP[x] = 1;
    MAP[(MAP_H - 1) * MAP_W + x] = 1;
  }
  for (let y = 0; y < MAP_H; y++) {
    MAP[y * MAP_W] = 1;
    MAP[y * MAP_W + MAP_W - 1] = 1;
  }

  // --- Step 6: Make sure spawn area (around 5,5) is open ---
  carveRoom(3, 3, 5, 5);
}
generateMap();

function getMap(x: number, y: number): number {
  if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) return 1;
  return MAP[y * MAP_W + x];
}

// Deterministic hash for wall cell + side -> decides if image present & which one
function wallHash(cx: number, cy: number, side: number): number {
  let h = (cx * 73856093) ^ (cy * 19349663) ^ (side * 83492791);
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = (h >>> 16) ^ h;
  return h >>> 0;
}

// Floor patch hash
function floorHash(fx: number, fy: number): number {
  let h = (fx * 48611) ^ (fy * 22643);
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = (h >>> 16) ^ h;
  return h >>> 0;
}

// Describe surroundings from a position on the map for the AI
function describeSurroundings(x: number, y: number): { text: string; directions: Record<string, number> } {
  const mapX = Math.floor(x);
  const mapY = Math.floor(y);
  const lines: string[] = [];

  const directions: [string, number, number][] = [
    ["north", 0, -1],
    ["south", 0, 1],
    ["east", 1, 0],
    ["west", -1, 0],
  ];

  for (const [name, dx, dy] of directions) {
    let dist = 0;
    let branches = false;
    for (let i = 1; i <= 12; i++) {
      const cx = mapX + dx * i;
      const cy = mapY + dy * i;
      if (getMap(cx, cy) !== 0) {
        dist = i;
        break;
      }
      // Check for side openings (branches)
      if (dx === 0) {
        // Moving N/S, check E/W for branches
        if (getMap(cx + 1, cy) === 0 || getMap(cx - 1, cy) === 0) branches = true;
      } else {
        // Moving E/W, check N/S for branches
        if (getMap(cx, cy + 1) === 0 || getMap(cx, cy - 1) === 0) branches = true;
      }
    }
    if (dist === 1) {
      lines.push(`${name}: wall immediately`);
    } else if (dist > 0) {
      const branchNote = branches ? ", corridor branches off to the side" : "";
      lines.push(`${name}: corridor extends ${dist - 1} steps then hits a wall${branchNote}`);
    } else {
      lines.push(`${name}: long corridor stretching into darkness${branches ? ", with side passages" : ""}`);
    }
  }

  // Check for nearby wall features
  const nearbyFeatures: string[] = [];
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const cx = mapX + dx;
      const cy = mapY + dy;
      if (getMap(cx, cy) !== 0) {
        // Check what kind of wall decoration using same hash as renderer
        const wh = wallHash(cx, cy, 0);
        const decorRoll = wh % 100;
        if (decorRoll < 22) nearbyFeatures.push("a faded, distorted photograph on a nearby wall");
        else if (decorRoll < 34) {
          const words = ["WHY", "HELP", "EXIT", "NO", "WAITING", "RUN", "404", "NULL", "???",
            "do not trust the", "they were here bef", "something watches", "no exit found",
            "day 12 still here", "the images change"];
          nearbyFeatures.push(`scratched text on the wall reading "${words[wh % words.length]}"`);
        }
        else if (decorRoll < 41) nearbyFeatures.push("a child's crayon drawing on the wall");
        else if (decorRoll < 51) nearbyFeatures.push("a dark stain seeping down the wall");
      }
      if (nearbyFeatures.length >= 2) break;
    }
    if (nearbyFeatures.length >= 2) break;
  }
  if (nearbyFeatures.length > 0) {
    lines.push(`\nNearby: ${nearbyFeatures.join(". ")}`);
  }

  // Ambient details
  lines.push("\nThe fluorescent lights buzz overhead. Some flicker. Some are dead.");

  // Build direction distances for exploration tracking
  const dirDists: Record<string, number> = {};
  for (const [name, dx, dy] of directions) {
    let openTiles = 0;
    for (let i = 1; i <= 12; i++) {
      if (getMap(mapX + dx * i, mapY + dy * i) !== 0) break;
      openTiles++;
    }
    dirDists[name] = openTiles;
  }

  return { text: lines.join("\n"), directions: dirDists };
}

// Animal Crossing style speech beep — one per character, creepy/low pitched
function playSpeechBeep(actx: AudioContext, charCode: number) {
  // Pitch varies by character — lower, more unsettling than Animal Crossing
  const baseFreq = 80 + (charCode % 20) * 8; // 80-240Hz range (low and eerie)
  const osc = actx.createOscillator();
  osc.type = 'square'; // harsh square wave
  osc.frequency.value = baseFreq;

  const gain = actx.createGain();
  gain.gain.setValueAtTime(0.06, actx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.06);

  // Low pass filter to soften it slightly
  const filter = actx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 600;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(actx.destination);
  osc.start();
  osc.stop(actx.currentTime + 0.06);
}

function playSpeechEcho(actx: AudioContext) {
  const osc = actx.createOscillator();
  osc.frequency.value = 200;
  osc.type = 'sine';
  const gain = actx.createGain();
  gain.gain.setValueAtTime(0.03, actx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(actx.destination);
  osc.start();
  osc.stop(actx.currentTime + 0.5);
}

export default function CorridorView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [thought, setThought] = useState<string | null>(null);
  const [speech, setSpeech] = useState<string | null>(null);
  const [displayedSpeech, setDisplayedSpeech] = useState("");
  const [displayedThought, setDisplayedThought] = useState("");
  const [thoughtVisible, setThoughtVisible] = useState(false);
  const [speechVisible, setSpeechVisible] = useState(false);
  const speechIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const thoughtIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isThoughtTyping = useRef(false);
  const isSpeechTyping = useRef(false);
  const [emotion, setEmotion] = useState("confused");
  const [showLore, setShowLore] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const [noteDisplay, setNoteDisplay] = useState<{ text: string; type: 'found' | 'written' } | null>(null);

  // Refs for communicating between render loop and AI tick
  const posRef = useRef({ x: 5.5, y: 5.5 });
  const angleRef = useRef(0);
  const aiDirRef = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastHeardSoundRef = useRef<string | null>(null);

  // AI tick — call every 4 seconds
  const aiTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const doAiTick = useCallback(async () => {
    const { x, y } = posRef.current;
    const { text: surroundingsText, directions: dirData } = describeSurroundings(x, y);
    let surroundings = surroundingsText;

    if (lastHeardSoundRef.current) {
      surroundings += `\nYou hear: ${lastHeardSoundRef.current}`;
      lastHeardSoundRef.current = null;
    }

    try {
      const res = await fetch("/api/corridor-tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ surroundings, posX: x, posY: y, directions: dirData, angle: angleRef.current }),
      });
      const data = await res.json();

      if (data.direction) {
        aiDirRef.current = data.direction;
      }
      if (data.emotion) {
        setEmotion(data.emotion);
      }
      if (data.thought && !isThoughtTyping.current) {
        // Clear any leftover interval
        if (thoughtIntervalRef.current) { clearInterval(thoughtIntervalRef.current); thoughtIntervalRef.current = null; }

        isThoughtTyping.current = true;
        const fullThought = data.thought;
        setThought(fullThought);
        setDisplayedThought("");
        setThoughtVisible(true);

        let idx = 0;
        thoughtIntervalRef.current = setInterval(() => {
          if (idx < fullThought.length) {
            setDisplayedThought(fullThought.slice(0, idx + 1));
            const char = fullThought[idx];
            if (char !== ' ' && audioCtxRef.current) {
              playSpeechBeep(audioCtxRef.current, char.charCodeAt(0) + 30);
            }
            idx++;
          } else {
            clearInterval(thoughtIntervalRef.current!);
            thoughtIntervalRef.current = null;
            setTimeout(() => {
              setThoughtVisible(false);
              isThoughtTyping.current = false;
            }, 3000);
          }
        }, 45);
      }
      if (data.speech && !isSpeechTyping.current) {
        if (speechIntervalRef.current) { clearInterval(speechIntervalRef.current); speechIntervalRef.current = null; }

        isSpeechTyping.current = true;
        const fullText = data.speech;
        setSpeech(fullText);
        setDisplayedSpeech("");
        setSpeechVisible(true);

        // Typewriter effect — one character at a time with speech beep
        let charIdx = 0;
        speechIntervalRef.current = setInterval(() => {
          if (charIdx < fullText.length) {
            const char = fullText[charIdx];
            setDisplayedSpeech(fullText.slice(0, charIdx + 1));
            // Play beep for non-space characters
            if (char !== ' ' && audioCtxRef.current) {
              playSpeechBeep(audioCtxRef.current, char.charCodeAt(0));
            }
            charIdx++;
          } else {
            clearInterval(speechIntervalRef.current!);
            speechIntervalRef.current = null;
            setTimeout(() => {
              setSpeechVisible(false);
              isSpeechTyping.current = false;
            }, 3000);
          }
        }, 50);
      }
      if (data.noteFound) {
        setNoteDisplay({ text: data.noteFound, type: 'found' });
        setTimeout(() => setNoteDisplay(null), 10000);
      }
      if (data.noteWritten) {
        setNoteDisplay({ text: '', type: 'written' });
        // Typewriter effect — reveal text character by character
        const fullText = data.noteWritten;
        let i = 0;
        const typeInterval = setInterval(() => {
          i++;
          setNoteDisplay({ text: fullText.slice(0, i), type: 'written' });
          if (i >= fullText.length) clearInterval(typeInterval);
        }, 40);
        setTimeout(() => { clearInterval(typeInterval); setNoteDisplay(null); }, 10000);
      }
    } catch {
      // Silently fail — agent keeps walking current direction
    }
  }, []);

  useEffect(() => {
    // Start AI tick interval
    doAiTick(); // First tick immediately
    aiTickRef.current = setInterval(doAiTick, 4000);
    return () => {
      if (aiTickRef.current) clearInterval(aiTickRef.current);
    };
  }, [doAiTick]);

  useEffect(() => {
    // Lock body scroll for raycaster page
    document.body.classList.add("raycaster");
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = true;

    // ── Audio system ──
    const startAudio = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
        setAudioStarted(true);
        startAmbientHum(audioCtxRef.current);
      }
    };
    canvas.addEventListener('click', startAudio);

    function startAmbientHum(actx: AudioContext) {
      const osc = actx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 60;
      const gain = actx.createGain();
      gain.gain.value = 0.015;
      const lfo = actx.createOscillator();
      lfo.frequency.value = 0.3;
      const lfoGain = actx.createGain();
      lfoGain.gain.value = 2;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start();
      lfo.start();
    }

    function playFootstep(actx: AudioContext) {
      const bufferSize = actx.sampleRate * 0.08;
      const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        const envelope = Math.exp(-t * 15);
        data[i] = (Math.random() * 2 - 1) * envelope * 0.3;
      }
      const source = actx.createBufferSource();
      source.buffer = buffer;
      const filter = actx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400 + Math.random() * 200;
      const gain = actx.createGain();
      gain.gain.value = 0.12;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(actx.destination);
      source.start();
    }

    function playMetalScrape(actx: AudioContext) {
      const bufferSize = actx.sampleRate * 0.3;
      const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        const envelope = Math.sin(t * Math.PI) * 0.3;
        data[i] = (Math.random() * 2 - 1) * envelope;
      }
      const source = actx.createBufferSource();
      source.buffer = buffer;
      const filter = actx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      filter.Q.value = 8;
      const gain = actx.createGain();
      gain.gain.value = 0.06;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(actx.destination);
      source.start();
    }

    function playDistantThud(actx: AudioContext) {
      const bufferSize = actx.sampleRate * 0.15;
      const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        const envelope = Math.exp(-t * 10);
        data[i] = (Math.random() * 2 - 1) * envelope * 0.4;
      }
      const source = actx.createBufferSource();
      source.buffer = buffer;
      const filter = actx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 150;
      const gain = actx.createGain();
      gain.gain.value = 0.07;
      // Simple delay for reverb feel
      const delay = actx.createDelay();
      delay.delayTime.value = 0.15;
      const fbGain = actx.createGain();
      fbGain.gain.value = 0.3;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(actx.destination);
      gain.connect(delay);
      delay.connect(fbGain);
      fbGain.connect(delay);
      fbGain.connect(actx.destination);
      source.start();
    }

    function playDoorSlam(actx: AudioContext) {
      const bufferSize = actx.sampleRate * 0.05;
      const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        const envelope = Math.exp(-t * 20);
        data[i] = (Math.random() * 2 - 1) * envelope * 0.5;
      }
      const source = actx.createBufferSource();
      source.buffer = buffer;
      const filter = actx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600;
      const gain = actx.createGain();
      gain.gain.value = 0.08;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(actx.destination);
      source.start();
    }

    function playWhisper(actx: AudioContext) {
      const bufferSize = actx.sampleRate * 0.5;
      const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        const envelope = Math.sin(t * Math.PI) * 0.2;
        data[i] = (Math.random() * 2 - 1) * envelope;
      }
      const source = actx.createBufferSource();
      source.buffer = buffer;
      const filter = actx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2000;
      const gain = actx.createGain();
      gain.gain.value = 0.05;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(actx.destination);
      source.start();
    }

    function playCrackle(actx: AudioContext) {
      for (let burst = 0; burst < 5; burst++) {
        const delay = burst * 0.03 + Math.random() * 0.02;
        const bufferSize = actx.sampleRate * 0.01;
        const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const t = i / bufferSize;
          const envelope = Math.exp(-t * 30);
          data[i] = (Math.random() * 2 - 1) * envelope * 0.4;
        }
        const source = actx.createBufferSource();
        source.buffer = buffer;
        const filter = actx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 3000 + Math.random() * 2000;
        filter.Q.value = 2;
        const gain = actx.createGain();
        gain.gain.value = 0.06;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(actx.destination);
        source.start(actx.currentTime + delay);
      }
    }

    let lastWalkFrame = -1;
    let lastAmbientSound = 0;

    // Player — position loaded from server so everyone sees the same MIKE
    let posX = 5.5, posY = 5.5;
    let dirX = 1, dirY = 0;
    let planeX = 0, planeY = 0.66;
    let currentAngle = 0;
    let targetAngle = 0;
    let angleSmoothing = true;

    // Load MIKE's current position from server
    fetch("/api/corridor-tick")
      .then(r => r.json())
      .then(data => {
        if (data.posX && data.posY) {
          posX = data.posX;
          posY = data.posY;
          if (data.angle !== undefined) {
            currentAngle = data.angle;
            targetAngle = data.angle;
            dirX = Math.cos(data.angle);
            dirY = Math.sin(data.angle);
            planeX = -Math.sin(data.angle) * 0.66;
            planeY = Math.cos(data.angle) * 0.66;
          }
          console.log(`[MIKE] Loaded position from server: (${posX.toFixed(1)}, ${posY.toFixed(1)}) tick ${data.ticks}`);
        }
      })
      .catch(() => { /* start fresh if server unavailable */ });

    // ── Smooth walking system ──
    let walkSpeed = 0; // current speed (accelerates/decelerates)
    const MAX_WALK_SPEED = 0.014;
    const WALK_ACCEL = 0.0004;
    const WALK_DECEL = 0.001;

    // ── Smart exploration system ──
    const visitedTiles = new Set<string>(); // persists across frames
    let lastDecisionTile = ""; // prevent re-deciding on same tile
    let cameFromAngle = currentAngle + Math.PI; // direction we came from (to avoid backtracking)
    let aiPreferredDir: string | null = null; // Claude's suggested direction (used as preference at junctions)

    function scoreDirection(px: number, py: number, ddx: number, ddy: number): number {
      let score = 0;
      for (let i = 1; i <= 15; i++) {
        const cx = Math.floor(px + ddx * i);
        const cy = Math.floor(py + ddy * i);
        if (getMap(cx, cy) !== 0) break; // hit wall
        score += 1;
        if (!visitedTiles.has(`${cx},${cy}`)) score += 5; // unvisited = way more valuable
      }
      return score;
    }

    function dirToAngle(dir: string): number {
      if (dir === "east") return 0;
      if (dir === "south") return Math.PI / 2;
      if (dir === "west") return Math.PI;
      if (dir === "north") return -Math.PI / 2;
      return 0;
    }

    // ── Weird environmental events ──
    interface WeirdEvent {
      type: string;
      startTime: number;
      duration: number;
      // Store any per-event data
      data?: Record<string, number>;
    }
    let activeEvents: WeirdEvent[] = [];
    let lastEventCheck = 0;
    // Deterministic next-event schedule using accumulator
    let nextLightsOut = 60000 + 30000 * Math.sin(1.23); // 60-90s
    let nextWallShift = 30000 + 20000 * Math.sin(2.34); // 30-50s
    let nextShadowFigure = 90000 + 30000 * Math.sin(3.45); // 90-120s
    let nextCorridorStretch = 45000 + 25000 * Math.sin(4.56); // 45-70s
    let nextStaticBurst = 25000 + 15000 * Math.sin(5.67); // 25-40s
    let nextColorDrain = 120000 + 30000 * Math.sin(6.78); // 120-150s
    let eventAccumulator = 0;
    let lastEventFrame = 0;

    // ── Generate wall texture at startup ──
    // UNISON walls: dark brick with patches of corruption and small distorted images
    const TEX_SIZE = 64;

    // Texture 0 — Brick (improved)
    function createBrickTexture(): ImageData {
      const c = document.createElement("canvas");
      c.width = TEX_SIZE;
      c.height = TEX_SIZE;
      const tc = c.getContext("2d")!;

      for (let y = 0; y < TEX_SIZE; y++) {
        for (let x = 0; x < TEX_SIZE; x++) {
          const brickH = 8;
          const brickW = 16;
          const row = Math.floor(y / brickH);
          const offset = (row % 2) * (brickW / 2);
          const brickX = (x + offset) % brickW;
          const isGrout = y % brickH === 0 || brickX === 0;

          if (isGrout) {
            tc.fillStyle = "#1A1515";
          } else {
            const hash = (x * 7 + y * 13 + row * 31) & 0xFF;
            const brickIdx = Math.floor((x + offset) / brickW + row * 4);
            if (hash > 240) {
              const hue = (brickIdx * 73) % 360;
              tc.fillStyle = `hsl(${hue}, 30%, 20%)`;
            } else {
              const r = 45 + (hash % 15);
              const g = 28 + (hash % 10);
              const b = 22 + (hash % 8);
              tc.fillStyle = `rgb(${r},${g},${b})`;
            }
          }
          tc.fillRect(x, y, 1, 1);
        }
      }

      // Corrupted image patches
      const patchCount = 1 + ((TEX_SIZE * 3) % 2);
      for (let p = 0; p < patchCount; p++) {
        const px = 4 + ((p * 37 + 11) % (TEX_SIZE - 20));
        const py = 8 + ((p * 53 + 7) % (TEX_SIZE - 24));
        const pw = 8 + ((p * 19) % 8);
        const ph = 8 + ((p * 23) % 8);
        for (let by = 0; by < ph; by += 4) {
          for (let bx = 0; bx < pw; bx += 4) {
            const hash = (px + bx) * 97 + (py + by) * 61 + p * 41;
            const r = (hash * 3) & 0xFF;
            const g = (hash * 7) & 0xFF;
            const b = (hash * 13) & 0xFF;
            const dr = Math.round(r * 0.3 + 30);
            const dg = Math.round(g * 0.3 + 25);
            const db = Math.round(b * 0.3 + 25);
            tc.fillStyle = `rgb(${dr},${dg},${db})`;
            tc.fillRect(px + bx, py + by, 4, 4);
          }
        }
        tc.strokeStyle = "rgba(200,200,190,0.3)";
        tc.lineWidth = 1;
        tc.strokeRect(px, py, pw, ph);
      }

      for (let i = 0; i < 2; i++) {
        const gy = (i * 31 + 17) % TEX_SIZE;
        tc.fillStyle = `rgba(80,120,120,0.15)`;
        tc.fillRect(0, gy, TEX_SIZE, 1);
      }

      return tc.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
    }

    // Texture 1 — Concrete: flat grey with speckles and cracks
    function createConcreteTexture(): ImageData {
      const c = document.createElement("canvas");
      c.width = TEX_SIZE;
      c.height = TEX_SIZE;
      const tc = c.getContext("2d")!;

      for (let y = 0; y < TEX_SIZE; y++) {
        for (let x = 0; x < TEX_SIZE; x++) {
          const hash = ((x * 113 + y * 79) * 0x45d9f3b) >>> 0;
          const speckle = (hash & 0xF) - 8; // -8 to +7
          const r = 58 + speckle;
          const g = 58 + speckle;
          const b = 56 + speckle;
          tc.fillStyle = `rgb(${r},${g},${b})`;
          tc.fillRect(x, y, 1, 1);
        }
      }

      // Horizontal crack lines
      const cracks = [12, 29, 48];
      for (const cy of cracks) {
        let cx = 0;
        while (cx < TEX_SIZE) {
          const hash = ((cy * 53 + cx * 31) * 0x45d9f3b) >>> 0;
          const len = 3 + (hash % 8);
          const drift = (hash >> 8) % 3 === 0 ? 1 : 0;
          tc.fillStyle = `rgba(30,30,28,${0.4 + (hash % 30) / 100})`;
          tc.fillRect(cx, cy + drift, Math.min(len, TEX_SIZE - cx), 1);
          // Gap
          cx += len + 2 + (hash >> 4) % 5;
        }
      }

      // Darker patches for industrial feel
      for (let i = 0; i < 3; i++) {
        const px = (i * 23 + 5) % (TEX_SIZE - 10);
        const py = (i * 37 + 8) % (TEX_SIZE - 10);
        tc.fillStyle = `rgba(25,25,23,0.15)`;
        tc.fillRect(px, py, 8 + (i * 7) % 6, 6 + (i * 11) % 5);
      }

      return tc.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
    }

    // Texture 2 — Clinical tile: off-white with grout grid
    function createTileTexture(): ImageData {
      const c = document.createElement("canvas");
      c.width = TEX_SIZE;
      c.height = TEX_SIZE;
      const tc = c.getContext("2d")!;

      const tileSize = 16;
      for (let y = 0; y < TEX_SIZE; y++) {
        for (let x = 0; x < TEX_SIZE; x++) {
          const tileRow = Math.floor(y / tileSize);
          const tileCol = Math.floor(x / tileSize);
          const isGrout = y % tileSize === 0 || x % tileSize === 0;

          if (isGrout) {
            tc.fillStyle = "#555550";
          } else {
            // Each tile has a slightly different shade
            const tileHash = ((tileRow * 17 + tileCol * 31) * 0x45d9f3b) >>> 0;
            const shade = (tileHash % 12) - 6;
            const base = 138;
            const r = base + shade;
            const g = base + shade;
            const b = base + shade - 3;
            // Subtle pixel noise within tile
            const pixHash = ((x * 7 + y * 13) * 0x45d9f3b) >>> 0;
            const noise = (pixHash % 6) - 3;
            tc.fillStyle = `rgb(${r + noise},${g + noise},${b + noise})`;
          }
          tc.fillRect(x, y, 1, 1);
        }
      }

      // A few dirty spots on tiles
      for (let i = 0; i < 4; i++) {
        const sx = (i * 41 + 7) % (TEX_SIZE - 4);
        const sy = (i * 29 + 11) % (TEX_SIZE - 4);
        tc.fillStyle = `rgba(90,85,75,0.2)`;
        tc.beginPath();
        tc.arc(sx + 2, sy + 2, 2, 0, Math.PI * 2);
        tc.fill();
      }

      return tc.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
    }

    // Texture 3 — Corrupted wallpaper: yellow-brown with torn vertical stripes
    function createWallpaperTexture(): ImageData {
      const c = document.createElement("canvas");
      c.width = TEX_SIZE;
      c.height = TEX_SIZE;
      const tc = c.getContext("2d")!;

      for (let y = 0; y < TEX_SIZE; y++) {
        for (let x = 0; x < TEX_SIZE; x++) {
          // Base yellow-brown
          const hash = ((x * 53 + y * 97) * 0x45d9f3b) >>> 0;
          const noise = (hash % 8) - 4;
          let r = 107 + noise;
          let g = 91 + noise;
          let b = 42 + Math.floor(noise * 0.5);

          // Vertical stripe pattern every 8 pixels
          const stripe = x % 8;
          if (stripe < 2) {
            r -= 12;
            g -= 10;
            b -= 6;
          } else if (stripe === 4 || stripe === 5) {
            r += 5;
            g += 4;
            b += 2;
          }

          tc.fillStyle = `rgb(${r},${g},${b})`;
          tc.fillRect(x, y, 1, 1);
        }
      }

      // Torn/hanging strips — irregular darker patches
      for (let i = 0; i < 5; i++) {
        const sx = (i * 13 + 3) % TEX_SIZE;
        const sy = (i * 37 + 10) % (TEX_SIZE - 20);
        const sw = 3 + (i * 7) % 5;
        const sh = 10 + (i * 11) % 15;
        // Darker patch where wallpaper is peeling
        tc.fillStyle = `rgba(35,30,18,${0.3 + (i % 3) * 0.1})`;
        tc.fillRect(sx, sy, sw, sh);
        // Curled edge at bottom — slightly lighter line
        tc.fillStyle = `rgba(130,115,60,0.3)`;
        tc.fillRect(sx, sy + sh, sw, 1);
      }

      // Horizontal damage line
      const damageY = 38;
      tc.fillStyle = `rgba(40,35,20,0.25)`;
      tc.fillRect(0, damageY, TEX_SIZE, 2);

      return tc.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
    }

    // ── Wolfenstein-style stone wall (grey stone blocks, classic look) ──
    function createWolfensteinTexture(): ImageData {
      const c = document.createElement("canvas");
      c.width = TEX_SIZE; c.height = TEX_SIZE;
      const tc = c.getContext("2d")!;
      for (let y = 0; y < TEX_SIZE; y++) {
        for (let x = 0; x < TEX_SIZE; x++) {
          const blockH = 16; const blockW = 32;
          const row = Math.floor(y / blockH);
          const off = (row % 2) * (blockW / 2);
          const bx = (x + off) % blockW;
          const isGrout = y % blockH < 1 || bx < 1;
          const h = (x * 7 + y * 13 + row * 31) & 0xFF;
          if (isGrout) {
            tc.fillStyle = "#222222";
          } else {
            // Classic grey stone
            const base = 85 + (h % 20);
            tc.fillStyle = `rgb(${base},${base - 5},${base - 8})`;
          }
          tc.fillRect(x, y, 1, 1);
        }
      }
      // Blue highlight strip (Wolfenstein style)
      tc.fillStyle = "rgba(50, 50, 180, 0.15)";
      tc.fillRect(0, 28, TEX_SIZE, 3);
      return tc.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
    }

    // ── DOOM-style metal panel (dark metal with rivets and panel lines) ──
    function createDoomTexture(): ImageData {
      const c = document.createElement("canvas");
      c.width = TEX_SIZE; c.height = TEX_SIZE;
      const tc = c.getContext("2d")!;
      // Base metal
      for (let y = 0; y < TEX_SIZE; y++) {
        for (let x = 0; x < TEX_SIZE; x++) {
          const h = (x * 11 + y * 7) & 0xFF;
          const base = 50 + (h % 12);
          tc.fillStyle = `rgb(${base + 5},${base},${base - 3})`;
          tc.fillRect(x, y, 1, 1);
        }
      }
      // Horizontal panel line
      tc.fillStyle = "#222";
      tc.fillRect(0, 31, TEX_SIZE, 2);
      // Vertical panel lines
      tc.fillRect(0, 0, 1, TEX_SIZE);
      tc.fillRect(TEX_SIZE - 1, 0, 1, TEX_SIZE);
      // Rivets (small bright dots in corners)
      const rivetCol = "#888";
      tc.fillStyle = rivetCol;
      tc.fillRect(4, 4, 2, 2); tc.fillRect(58, 4, 2, 2);
      tc.fillRect(4, 58, 2, 2); tc.fillRect(58, 58, 2, 2);
      tc.fillRect(30, 4, 2, 2); tc.fillRect(30, 58, 2, 2);
      // Slight rust/brown patches
      tc.fillStyle = "rgba(100, 50, 20, 0.15)";
      tc.fillRect(10, 40, 15, 8);
      tc.fillRect(45, 10, 10, 12);
      return tc.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
    }

    // ── Catacomb 3D-style purple/blue stone (ancient, magical feel) ──
    function createCatacombTexture(): ImageData {
      const c = document.createElement("canvas");
      c.width = TEX_SIZE; c.height = TEX_SIZE;
      const tc = c.getContext("2d")!;
      for (let y = 0; y < TEX_SIZE; y++) {
        for (let x = 0; x < TEX_SIZE; x++) {
          const blockH = 12; const blockW = 24;
          const row = Math.floor(y / blockH);
          const off = (row % 2) * (blockW / 2);
          const bx = (x + off) % blockW;
          const isGrout = y % blockH < 1 || bx < 1;
          const h = (x * 13 + y * 7 + row * 19) & 0xFF;
          if (isGrout) {
            tc.fillStyle = "#1A1020";
          } else {
            // Purple/blue stone
            const r = 40 + (h % 15);
            const g = 25 + (h % 10);
            const b = 60 + (h % 20);
            tc.fillStyle = `rgb(${r},${g},${b})`;
          }
          tc.fillRect(x, y, 1, 1);
        }
      }
      // Mysterious glyph-like marks
      tc.fillStyle = "rgba(120, 80, 180, 0.2)";
      tc.fillRect(20, 20, 2, 20);
      tc.fillRect(20, 20, 15, 2);
      tc.fillRect(35, 20, 2, 12);
      tc.fillRect(25, 30, 10, 2);
      return tc.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
    }

    // Generate all 7 wall textures — original 4 + 3 game-era textures
    const wallTextures = [
      createBrickTexture(),      // 0 — standard
      createConcreteTexture(),   // 1 — industrial
      createTileTexture(),       // 2 — clinical
      createWallpaperTexture(),  // 3 — backrooms
      createWolfensteinTexture(),// 4 — grey stone (rare)
      createDoomTexture(),       // 5 — metal panels (rare)
      createCatacombTexture(),   // 6 — purple stone (rare)
    ];
    // Keep backward compat alias for kids drawings that call createTexture
    function createTexture(): ImageData { return createBrickTexture(); }

    // ── Kids drawing textures ──
    function createKidsDrawing(seed: number): ImageData {
      const c = document.createElement("canvas");
      c.width = TEX_SIZE;
      c.height = TEX_SIZE;
      const tc = c.getContext("2d")!;

      // Start with base brick
      tc.putImageData(createTexture(), 0, 0);

      // Draw a small patch (roughly 20x20) somewhere on the wall
      const px = 10 + (seed * 17) % (TEX_SIZE - 30);
      const py = 10 + (seed * 31) % (TEX_SIZE - 30);
      const crayonColors = ["#CC3333", "#3366CC", "#CCCC33", "#33AA33", "#CC6633"];

      const drawType = seed % 5;
      tc.lineWidth = 1.5;

      if (drawType === 0) {
        // Stick figure
        const col = crayonColors[seed % crayonColors.length];
        tc.strokeStyle = col;
        tc.beginPath();
        // Head
        tc.arc(px + 8, py + 4, 3, 0, Math.PI * 2);
        tc.stroke();
        // Body
        tc.beginPath();
        tc.moveTo(px + 8, py + 7);
        tc.lineTo(px + 8, py + 15);
        tc.stroke();
        // Arms
        tc.beginPath();
        tc.moveTo(px + 4, py + 10);
        tc.lineTo(px + 12, py + 10);
        tc.stroke();
        // Legs
        tc.beginPath();
        tc.moveTo(px + 8, py + 15);
        tc.lineTo(px + 5, py + 20);
        tc.moveTo(px + 8, py + 15);
        tc.lineTo(px + 11, py + 20);
        tc.stroke();
      } else if (drawType === 1) {
        // House
        const col = crayonColors[(seed + 1) % crayonColors.length];
        tc.strokeStyle = col;
        // Walls
        tc.strokeRect(px + 3, py + 10, 14, 10);
        // Roof
        tc.beginPath();
        tc.moveTo(px + 2, py + 10);
        tc.lineTo(px + 10, py + 3);
        tc.lineTo(px + 18, py + 10);
        tc.stroke();
        // Door
        tc.strokeStyle = crayonColors[(seed + 2) % crayonColors.length];
        tc.strokeRect(px + 8, py + 14, 4, 6);
      } else if (drawType === 2) {
        // Sun
        const col = "#CCCC33";
        tc.strokeStyle = col;
        tc.fillStyle = col;
        tc.beginPath();
        tc.arc(px + 8, py + 8, 4, 0, Math.PI * 2);
        tc.fill();
        // Rays
        for (let r = 0; r < 8; r++) {
          const angle = (r / 8) * Math.PI * 2;
          tc.beginPath();
          tc.moveTo(px + 8 + Math.cos(angle) * 5, py + 8 + Math.sin(angle) * 5);
          tc.lineTo(px + 8 + Math.cos(angle) * 9, py + 8 + Math.sin(angle) * 9);
          tc.stroke();
        }
        // Small ground line in green
        tc.strokeStyle = "#33AA33";
        tc.beginPath();
        tc.moveTo(px, py + 18);
        tc.lineTo(px + 18, py + 18);
        tc.stroke();
      } else if (drawType === 3) {
        // Heart
        const col = "#CC3333";
        tc.fillStyle = col;
        tc.beginPath();
        tc.moveTo(px + 8, py + 6);
        tc.bezierCurveTo(px + 8, py + 3, px + 3, py + 2, px + 3, py + 6);
        tc.bezierCurveTo(px + 3, py + 10, px + 8, py + 14, px + 8, py + 16);
        tc.bezierCurveTo(px + 8, py + 14, px + 13, py + 10, px + 13, py + 6);
        tc.bezierCurveTo(px + 13, py + 2, px + 8, py + 3, px + 8, py + 6);
        tc.fill();
      } else {
        // Flower
        const petalCol = "#CC6699";
        const centerCol = "#CCCC33";
        tc.fillStyle = petalCol;
        for (let p = 0; p < 5; p++) {
          const angle = (p / 5) * Math.PI * 2 - Math.PI / 2;
          tc.beginPath();
          tc.arc(px + 8 + Math.cos(angle) * 4, py + 8 + Math.sin(angle) * 4, 3, 0, Math.PI * 2);
          tc.fill();
        }
        tc.fillStyle = centerCol;
        tc.beginPath();
        tc.arc(px + 8, py + 8, 2.5, 0, Math.PI * 2);
        tc.fill();
        // Stem
        tc.strokeStyle = "#33AA33";
        tc.lineWidth = 1.2;
        tc.beginPath();
        tc.moveTo(px + 8, py + 12);
        tc.lineTo(px + 8, py + 20);
        tc.stroke();
      }

      // Make it look faded/scratchy — reduce opacity by blending with brick
      const result = tc.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
      const base = createTexture();
      for (let i = 0; i < result.data.length; i += 4) {
        // Blend 60% drawing, 40% brick to look faded
        result.data[i] = Math.round(result.data[i] * 0.6 + base.data[i] * 0.4);
        result.data[i+1] = Math.round(result.data[i+1] * 0.6 + base.data[i+1] * 0.4);
        result.data[i+2] = Math.round(result.data[i+2] * 0.6 + base.data[i+2] * 0.4);
      }
      return result;
    }

    const kidsDrawings = [createKidsDrawing(0), createKidsDrawing(1), createKidsDrawing(2), createKidsDrawing(3), createKidsDrawing(4)];

    // ── Note sprite texture (small piece of paper on the wall) ──
    const NOTE_SPRITE_W = 16;
    const NOTE_SPRITE_H = 20;

    function createNoteSprite(read: boolean): ImageData {
      const c = document.createElement("canvas");
      c.width = NOTE_SPRITE_W;
      c.height = NOTE_SPRITE_H;
      const tc = c.getContext("2d")!;
      tc.clearRect(0, 0, NOTE_SPRITE_W, NOTE_SPRITE_H);

      // Paper background — cream/off-white
      const paperR = read ? 160 : 210;
      const paperG = read ? 155 : 200;
      const paperB = read ? 140 : 175;
      tc.fillStyle = `rgb(${paperR},${paperG},${paperB})`;
      // Slightly irregular shape — torn edge at bottom-right
      tc.beginPath();
      tc.moveTo(1, 1);
      tc.lineTo(14, 0);
      tc.lineTo(15, 1);
      tc.lineTo(15, 17);
      tc.lineTo(13, 19);
      tc.lineTo(11, 18);
      tc.lineTo(1, 19);
      tc.lineTo(0, 18);
      tc.lineTo(0, 2);
      tc.closePath();
      tc.fill();

      // Scribbled lines (unreadable text — dark marks)
      const lineColor = read ? 'rgba(80,70,60,0.4)' : 'rgba(50,40,30,0.6)';
      tc.strokeStyle = lineColor;
      tc.lineWidth = 0.8;
      for (let row = 0; row < 6; row++) {
        const ly = 4 + row * 2.5;
        const lx1 = 2 + (row * 3) % 2;
        const lx2 = 11 + (row * 7) % 3;
        tc.beginPath();
        tc.moveTo(lx1, ly);
        tc.lineTo(lx2, ly + ((row * 13) % 3 - 1) * 0.3);
        tc.stroke();
      }

      // If read, add a subtle checkmark in corner
      if (read) {
        tc.strokeStyle = 'rgba(80,140,80,0.5)';
        tc.lineWidth = 1.2;
        tc.beginPath();
        tc.moveTo(10, 14);
        tc.lineTo(12, 16);
        tc.lineTo(14, 12);
        tc.stroke();
      }

      // Shadow on left/bottom edge
      tc.fillStyle = 'rgba(0,0,0,0.15)';
      tc.fillRect(0, 18, 14, 1);
      tc.fillRect(0, 1, 1, 18);

      return tc.getImageData(0, 0, NOTE_SPRITE_W, NOTE_SPRITE_H);
    }

    const noteSpriteUnread = createNoteSprite(false);
    const noteSpriteRead = createNoteSprite(true);

    // ── Load real images and create distorted textures ──
    const imageSrcs = [
      '/images/family1.jpg', '/images/family2.jpg', '/images/nature1.jpg', '/images/hallway1.jpg',
      '/images/pet1.jpg', '/images/drawing1.jpg', '/images/landscape1.jpg', '/images/selfie1.jpg',
      '/images/screen1.jpg', '/images/kids1.jpg', '/images/oldphoto1.jpg', '/images/room1.jpg',
      '/images/sunset1.jpg', '/images/cat1.jpg', '/images/birthday1.jpg', '/images/wedding1.jpg',
      '/images/people1.jpg', '/images/people2.jpg', '/images/child1.jpg', '/images/party1.jpg',
      '/images/old1.jpg', '/images/school1.jpg',
    ];
    const imageElements: HTMLImageElement[] = [];
    let imagesLoaded = 0;
    const distortedTextures: ImageData[] = [];

    function createDistortedTexture(img: HTMLImageElement, index: number): ImageData {
      const c = document.createElement("canvas");
      c.width = TEX_SIZE;
      c.height = TEX_SIZE;
      const tc = c.getContext("2d")!;

      // Draw image scaled to TEX_SIZE x TEX_SIZE
      tc.drawImage(img, 0, 0, TEX_SIZE, TEX_SIZE);
      const imgData = tc.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
      const pixels = imgData.data;

      // Distortion level varies per image (0 = least, 7 = most)
      const distLevel = ((index * 37 + 13) % 5) + 1; // 1-5

      // 1. Desaturate 30-50% and add color tint
      const desatAmount = 0.3 + (index % 3) * 0.1; // 0.3 to 0.5
      const tintR = (index * 17 + 5) % 30; // slight tint
      const tintG = (index * 11 + 3) % 15;
      const tintB = (index * 23 + 7) % 25;
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        const gray = r * 0.299 + g * 0.587 + b * 0.114;
        pixels[i] = Math.min(255, Math.round(r * (1 - desatAmount) + gray * desatAmount + tintR * 0.3));
        pixels[i + 1] = Math.min(255, Math.round(g * (1 - desatAmount) + gray * desatAmount + tintG * 0.2));
        pixels[i + 2] = Math.min(255, Math.round(b * (1 - desatAmount) + gray * desatAmount + tintB * 0.3));
        // Darken overall to fit the wall vibe
        pixels[i] = Math.round(pixels[i] * 0.7);
        pixels[i + 1] = Math.round(pixels[i + 1] * 0.65);
        pixels[i + 2] = Math.round(pixels[i + 2] * 0.65);
      }

      // 2. Chromatic aberration — shift red right, blue left
      const shift = 2 + (distLevel > 3 ? 1 : 0);
      const copy = new Uint8ClampedArray(pixels);
      for (let y = 0; y < TEX_SIZE; y++) {
        for (let x = 0; x < TEX_SIZE; x++) {
          const idx = (y * TEX_SIZE + x) * 4;
          // Red from shifted left position
          const rxSrc = Math.max(0, x - shift);
          const rIdx = (y * TEX_SIZE + rxSrc) * 4;
          pixels[idx] = copy[rIdx]; // red channel
          // Blue from shifted right position
          const bxSrc = Math.min(TEX_SIZE - 1, x + shift);
          const bIdx = (y * TEX_SIZE + bxSrc) * 4;
          pixels[idx + 2] = copy[bIdx + 2]; // blue channel
        }
      }

      // 3. Horizontal scan lines — every 4th row darker
      for (let y = 0; y < TEX_SIZE; y++) {
        if (y % 4 === 0) {
          for (let x = 0; x < TEX_SIZE; x++) {
            const idx = (y * TEX_SIZE + x) * 4;
            pixels[idx] = Math.round(pixels[idx] * 0.6);
            pixels[idx + 1] = Math.round(pixels[idx + 1] * 0.6);
            pixels[idx + 2] = Math.round(pixels[idx + 2] * 0.6);
          }
        }
      }

      // 4. Random block corruption — JPEG artifact look
      const blockCount = distLevel + 1;
      for (let b = 0; b < blockCount; b++) {
        const bx = ((b * 47 + index * 13) % (TEX_SIZE - 8));
        const by = ((b * 31 + index * 29) % (TEX_SIZE - 8));
        const bw = 4 + ((b * 17) % 6);
        const bh = 4 + ((b * 11) % 4);
        // Shift source — duplicate a nearby block
        const srcX = (bx + 8 + ((b * 7) % 12)) % TEX_SIZE;
        const srcY = (by + ((b * 3) % 8)) % TEX_SIZE;
        for (let dy = 0; dy < bh && by + dy < TEX_SIZE && srcY + dy < TEX_SIZE; dy++) {
          for (let dx = 0; dx < bw && bx + dx < TEX_SIZE && srcX + dx < TEX_SIZE; dx++) {
            const dstIdx = ((by + dy) * TEX_SIZE + (bx + dx)) * 4;
            const srcIdx = ((srcY + dy) * TEX_SIZE + (srcX + dx)) * 4;
            pixels[dstIdx] = pixels[srcIdx];
            pixels[dstIdx + 1] = pixels[srcIdx + 1];
            pixels[dstIdx + 2] = pixels[srcIdx + 2];
          }
        }
      }

      tc.putImageData(imgData, 0, 0);
      return tc.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
    }

    for (let i = 0; i < imageSrcs.length; i++) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        distortedTextures[i] = createDistortedTexture(img, i);
        imagesLoaded++;
      };
      img.src = imageSrcs[i];
      imageElements.push(img);
    }

    function sampleTexture(tex: ImageData, u: number, v: number): [number, number, number] {
      const tx = Math.floor(u * TEX_SIZE) & (TEX_SIZE - 1);
      const ty = Math.floor(v * TEX_SIZE) & (TEX_SIZE - 1);
      const idx = (ty * TEX_SIZE + tx) * 4;
      return [tex.data[idx], tex.data[idx + 1], tex.data[idx + 2]];
    }

    // ── Generate smooth humanoid character sprite (4 walk frames) ──
    const SPRITE_W = 32;
    const SPRITE_H = 48;

    function createCharacterFrame(frame: number): ImageData {
      const c = document.createElement("canvas");
      c.width = SPRITE_W;
      c.height = SPRITE_H;
      const tc = c.getContext("2d")!;
      tc.clearRect(0, 0, SPRITE_W, SPRITE_H);

      // frame 0: left leg fwd, right arm fwd
      // frame 1: neutral standing
      // frame 2: right leg fwd, left arm fwd
      // frame 3: neutral standing (slight variation)

      const isNeutral = frame === 1 || frame === 3;
      const legSwing = isNeutral ? 0 : (frame === 0 ? 1 : -1);
      const armSwing = -legSwing; // opposite to legs

      // === BACK VIEW — smooth humanoid using arcs and paths ===

      // Head — round arc
      tc.fillStyle = "#5A3A1A"; // hair color (dark brown)
      tc.beginPath();
      tc.arc(16, 8, 6, 0, Math.PI * 2);
      tc.fill();

      // Ears — small arcs on the sides
      tc.fillStyle = "#C0A078";
      tc.beginPath();
      tc.arc(10, 7, 1.5, 0, Math.PI * 2);
      tc.fill();
      tc.beginPath();
      tc.arc(22, 7, 1.5, 0, Math.PI * 2);
      tc.fill();

      // Neck
      tc.fillStyle = "#B8987A";
      tc.fillRect(14, 13, 4, 3);

      // Torso — tapered trapezoid (wider shoulders, narrower waist)
      tc.fillStyle = "#4A5A6A";
      tc.beginPath();
      tc.moveTo(7, 16);   // left shoulder
      tc.lineTo(25, 16);  // right shoulder
      tc.quadraticCurveTo(24, 23, 22, 30); // right side curves in
      tc.lineTo(10, 30);  // waist
      tc.quadraticCurveTo(8, 23, 7, 16);   // left side curves in
      tc.closePath();
      tc.fill();

      // Spine shadow — subtle darker line
      tc.strokeStyle = "rgba(50, 60, 70, 0.4)";
      tc.lineWidth = 1.5;
      tc.beginPath();
      tc.moveTo(16, 17);
      tc.lineTo(16, 29);
      tc.stroke();

      // Shirt wrinkle hints
      tc.strokeStyle = "rgba(55, 65, 75, 0.3)";
      tc.lineWidth = 0.8;
      tc.beginPath();
      tc.moveTo(10, 20);
      tc.quadraticCurveTo(16, 21, 22, 20);
      tc.stroke();
      tc.beginPath();
      tc.moveTo(11, 25);
      tc.quadraticCurveTo(16, 26, 21, 25);
      tc.stroke();

      // Belt
      tc.fillStyle = "#252525";
      tc.beginPath();
      tc.moveTo(10, 29);
      tc.lineTo(22, 29);
      tc.lineTo(22, 31);
      tc.lineTo(10, 31);
      tc.closePath();
      tc.fill();

      // === Arms (tapered, with swing) ===
      // Left arm
      const leftArmEndY = 27 + armSwing * 2;
      const leftArmEndX = 6 + (armSwing > 0 ? -1 : armSwing < 0 ? 1 : 0);
      tc.fillStyle = "#3E4E5E";
      tc.beginPath();
      tc.moveTo(8, 16);   // shoulder top
      tc.lineTo(10, 16);  // shoulder inner
      tc.quadraticCurveTo(9, 22, leftArmEndX + 2, leftArmEndY);
      tc.lineTo(leftArmEndX, leftArmEndY); // wrist
      tc.quadraticCurveTo(7, 22, 8, 16);
      tc.closePath();
      tc.fill();
      // Left hand
      tc.fillStyle = "#B8987A";
      tc.beginPath();
      tc.arc(leftArmEndX + 1, leftArmEndY + 1, 1.5, 0, Math.PI * 2);
      tc.fill();

      // Right arm
      const rightArmEndY = 27 - armSwing * 2;
      const rightArmEndX = 26 + (armSwing < 0 ? 1 : armSwing > 0 ? -1 : 0);
      tc.fillStyle = "#3E4E5E";
      tc.beginPath();
      tc.moveTo(22, 16);  // shoulder inner
      tc.lineTo(24, 16);  // shoulder top
      tc.quadraticCurveTo(25, 22, rightArmEndX, rightArmEndY);
      tc.lineTo(rightArmEndX - 2, rightArmEndY);
      tc.quadraticCurveTo(23, 22, 22, 16);
      tc.closePath();
      tc.fill();
      // Right hand
      tc.fillStyle = "#B8987A";
      tc.beginPath();
      tc.arc(rightArmEndX - 1, rightArmEndY + 1, 1.5, 0, Math.PI * 2);
      tc.fill();

      // === Legs (tapered, with swing) ===
      // Left leg
      const leftLegOffsetX = legSwing > 0 ? -1 : legSwing < 0 ? 1 : 0;
      const leftLegBottomY = legSwing > 0 ? 43 : legSwing < 0 ? 45 : 44;
      tc.fillStyle = "#2A2A2A";
      tc.beginPath();
      tc.moveTo(10, 30);  // hip left
      tc.lineTo(15, 30);  // hip inner
      tc.quadraticCurveTo(14 + leftLegOffsetX, 37, 13 + leftLegOffsetX, leftLegBottomY);
      tc.lineTo(10 + leftLegOffsetX, leftLegBottomY);
      tc.quadraticCurveTo(10 + leftLegOffsetX, 37, 10, 30);
      tc.closePath();
      tc.fill();

      // Right leg
      const rightLegOffsetX = legSwing < 0 ? 1 : legSwing > 0 ? -1 : 0;
      const rightLegBottomY = legSwing < 0 ? 43 : legSwing > 0 ? 45 : 44;
      tc.fillStyle = "#2A2A2A";
      tc.beginPath();
      tc.moveTo(17, 30);  // hip inner
      tc.lineTo(22, 30);  // hip right
      tc.quadraticCurveTo(22 + rightLegOffsetX, 37, 21 + rightLegOffsetX, rightLegBottomY);
      tc.lineTo(18 + rightLegOffsetX, rightLegBottomY);
      tc.quadraticCurveTo(17 + rightLegOffsetX, 37, 17, 30);
      tc.closePath();
      tc.fill();

      // Feet — at the very bottom, grounded
      // Left foot
      tc.fillStyle = "#1A1A1A";
      tc.beginPath();
      tc.ellipse(11.5 + leftLegOffsetX, leftLegBottomY + 1.5, 3, 1.5, 0, 0, Math.PI * 2);
      tc.fill();
      // Right foot
      tc.beginPath();
      tc.ellipse(19.5 + rightLegOffsetX, rightLegBottomY + 1.5, 3, 1.5, 0, 0, Math.PI * 2);
      tc.fill();

      // Frame 3 slight variation: add a subtle shoulder tilt
      if (frame === 3) {
        tc.fillStyle = "rgba(74, 90, 106, 0.3)";
        tc.beginPath();
        tc.ellipse(16, 17, 8, 1, 0.05, 0, Math.PI * 2);
        tc.fill();
      }

      return tc.getImageData(0, 0, SPRITE_W, SPRITE_H);
    }

    const walkFrames = [
      createCharacterFrame(0),
      createCharacterFrame(1),
      createCharacterFrame(2),
      createCharacterFrame(3),
    ];
    const characterTexture = walkFrames[1]; // default standing frame

    // ── Sprite system ──
    interface Sprite {
      x: number;
      y: number;
      texture: ImageData;
      isAgent: boolean; // the main agent we're following
    }
    // The main agent sprite — position will be updated each frame to match posX/posY
    // texture will be swapped each frame for walk animation
    const agentSprite: Sprite = { x: 5.5, y: 5.5, texture: walkFrames[1], isAgent: true };
    const sprites: Sprite[] = [agentSprite];

    // ── Note sprites — visible on walls, matching FOUND_NOTES in corridor-tick ──
    // Note sprite positions — matching FOUND_NOTES keys in corridor-tick/route.ts
    // Placed at the center of the tile matching each note key
    const NOTE_POSITIONS = [
      { x: 5.5, y: 4.5 },   // "5,5" — offset slightly so not on top of spawn
      { x: 20.5, y: 10.5 }, // "20,10"
      { x: 40.5, y: 15.5 }, // "40,15"
      { x: 15.5, y: 35.5 }, // "15,35"
      { x: 55.5, y: 40.5 }, // "55,40"
      { x: 35.5, y: 60.5 }, // "35,60"
      { x: 10.5, y: 50.5 }, // "10,50"
      { x: 60.5, y: 20.5 }, // "60,20"
      { x: 50.5, y: 55.5 }, // "50,55"
      { x: 30.5, y: 30.5 }, // "30,30"
      { x: 70.5, y: 45.5 }, // "70,45"
      { x: 45.5, y: 70.5 }, // "45,70"
      { x: 65.5, y: 65.5 }, // "65,65"
    ];
    // Track which notes MIKE has read (by index)
    const readNotes = new Set<number>();

    // Snap note to a floor tile RIGHT NEXT to a wall — notes are ON walls
    function snapToWall(tx: number, ty: number): { x: number; y: number } {
      const mx = Math.floor(tx);
      const my = Math.floor(ty);
      // Find a floor tile that's adjacent to a wall
      for (let r = 0; r < 5; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const cx = mx + dx;
            const cy = my + dy;
            if (getMap(cx, cy) !== 0) continue; // must be floor
            // Check if adjacent to a wall
            if (getMap(cx + 1, cy) !== 0) return { x: cx + 0.85, y: cy + 0.5 }; // against east wall
            if (getMap(cx - 1, cy) !== 0) return { x: cx + 0.15, y: cy + 0.5 }; // against west wall
            if (getMap(cx, cy + 1) !== 0) return { x: cx + 0.5, y: cy + 0.85 }; // against south wall
            if (getMap(cx, cy - 1) !== 0) return { x: cx + 0.5, y: cy + 0.15 }; // against north wall
          }
        }
      }
      return { x: mx + 0.5, y: my + 0.5 };
    }

    const noteSprites: Sprite[] = [];
    for (let ni = 0; ni < NOTE_POSITIONS.length; ni++) {
      const pos = snapToWall(NOTE_POSITIONS[ni].x, NOTE_POSITIONS[ni].y);
      const ns: Sprite = { x: pos.x, y: pos.y, texture: noteSpriteUnread, isAgent: false };
      noteSprites.push(ns);
      sprites.push(ns);
    }

    // Camera offset behind the agent
    let CAMERA_DISTANCE = 2.8; // tight third-person like a real game

    // Smooth camera — persistent position that lerps toward target
    let smoothCamX = 5.5;
    let smoothCamY = 5.5;

    function sampleSprite(tex: ImageData, texW: number, texH: number, u: number, v: number): [number, number, number, number] {
      const tx = Math.floor(u * texW);
      const ty = Math.floor(v * texH);
      if (tx < 0 || tx >= texW || ty < 0 || ty >= texH) return [0, 0, 0, 0];
      const idx = (ty * texW + tx) * 4;
      return [tex.data[idx], tex.data[idx + 1], tex.data[idx + 2], tex.data[idx + 3]];
    }

    function render(now: number) {
      if (!running || !ctx || !canvas) return;

      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      const w = canvas.width;
      const h = canvas.height;

      // ── Agent AI-controlled movement (smart exploration) ──

      // Consume AI direction as a PREFERENCE (not immediate override)
      const newAiDir = aiDirRef.current;
      if (newAiDir) {
        aiPreferredDir = newAiDir;
        aiDirRef.current = null; // consumed
      }

      // Mark current tile as visited
      const tileKey = `${Math.floor(posX)},${Math.floor(posY)}`;
      visitedTiles.add(tileKey);

      // If visited tiles get very large, clear old ones to allow re-exploration
      if (visitedTiles.size > 600) {
        visitedTiles.clear();
      }

      // Check what's ahead, left, right
      const aheadOpen = getMap(Math.floor(posX + dirX * 1.2), Math.floor(posY + dirY * 1.2)) === 0;
      const leftDir = { x: dirY, y: -dirX }; // perpendicular left
      const rightDir = { x: -dirY, y: dirX }; // perpendicular right
      const leftOpen = getMap(Math.floor(posX + leftDir.x * 1.2), Math.floor(posY + leftDir.y * 1.2)) === 0;
      const rightOpen = getMap(Math.floor(posX + rightDir.x * 1.2), Math.floor(posY + rightDir.y * 1.2)) === 0;
      // Also check behind
      const behindOpen = getMap(Math.floor(posX - dirX * 1.2), Math.floor(posY - dirY * 1.2)) === 0;

      // Classify current position
      const isJunction = (leftOpen || rightOpen) && aheadOpen;
      const isDeadEnd = !aheadOpen && !leftOpen && !rightOpen;
      const isTurnCorner = !aheadOpen && (leftOpen || rightOpen);

      // Only make a new decision when entering a new tile
      const isNewTile = tileKey !== lastDecisionTile;

      if (isNewTile && (isJunction || isTurnCorner || isDeadEnd)) {
        lastDecisionTile = tileKey;

        if (isJunction) {
          // Junction! Score each open direction by unexplored potential
          const options: { angle: number; score: number; name: string }[] = [];

          if (aheadOpen) {
            const score = scoreDirection(posX, posY, dirX, dirY);
            options.push({ angle: currentAngle, score, name: 'ahead' });
          }
          if (leftOpen) {
            const score = scoreDirection(posX, posY, leftDir.x, leftDir.y);
            options.push({ angle: currentAngle - Math.PI / 2, score, name: 'left' });
          }
          if (rightOpen) {
            const score = scoreDirection(posX, posY, rightDir.x, rightDir.y);
            options.push({ angle: currentAngle + Math.PI / 2, score, name: 'right' });
          }

          // Penalize the direction we came from (anti-backtrack)
          for (const opt of options) {
            const angleToCameFrom = Math.atan2(Math.sin(opt.angle - cameFromAngle), Math.cos(opt.angle - cameFromAngle));
            if (Math.abs(angleToCameFrom) < 0.3) {
              opt.score -= 20; // heavy penalty for going back
            }
          }

          // If Claude suggested a direction and it's available, give it a bonus
          if (aiPreferredDir) {
            const prefAngle = dirToAngle(aiPreferredDir);
            for (const opt of options) {
              const angleDelta = Math.atan2(Math.sin(opt.angle - prefAngle), Math.cos(opt.angle - prefAngle));
              if (Math.abs(angleDelta) < 0.3) {
                opt.score += 8; // bonus for Claude's preference
              }
            }
            aiPreferredDir = null; // consumed
          }

          // Pick highest score (most unexplored)
          options.sort((a, b) => b.score - a.score);
          if (options.length > 0) {
            cameFromAngle = currentAngle + Math.PI; // remember where we came from
            targetAngle = options[0].angle;
            angleSmoothing = true;
          }
        } else if (isTurnCorner) {
          // Forced turn — wall ahead, side is open
          cameFromAngle = currentAngle + Math.PI;
          if (leftOpen && !rightOpen) {
            targetAngle = currentAngle - Math.PI / 2;
          } else if (rightOpen && !leftOpen) {
            targetAngle = currentAngle + Math.PI / 2;
          } else {
            // Both open — pick less visited
            const leftScore = scoreDirection(posX, posY, leftDir.x, leftDir.y);
            const rightScore = scoreDirection(posX, posY, rightDir.x, rightDir.y);
            targetAngle = leftScore > rightScore ? currentAngle - Math.PI / 2 : currentAngle + Math.PI / 2;
          }
          angleSmoothing = true;
        } else if (isDeadEnd) {
          // Dead end — turn around
          cameFromAngle = currentAngle; // we came from ahead, now turning back
          targetAngle = currentAngle + Math.PI;
          angleSmoothing = true;
        }
      }

      // Smoothly interpolate current angle toward target angle
      const angleDiff = targetAngle - currentAngle;
      const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
      if (Math.abs(normalizedDiff) > 0.01) {
        currentAngle += normalizedDiff * 0.06; // slightly faster turning for responsiveness
        angleSmoothing = true;
      } else {
        currentAngle = targetAngle;
        angleSmoothing = false;
      }

      // Update direction vectors from current angle
      dirX = Math.cos(currentAngle);
      dirY = Math.sin(currentAngle);
      planeX = -Math.sin(currentAngle) * 0.66;
      planeY = Math.cos(currentAngle) * 0.66;

      // Check distance to next wall ahead for speed control
      let distToWall = 0;
      for (let d = 1; d <= 8; d++) {
        if (getMap(Math.floor(posX + dirX * d * 0.5), Math.floor(posY + dirY * d * 0.5)) !== 0) {
          distToWall = d * 0.5;
          break;
        }
      }
      if (distToWall === 0) distToWall = 10; // far away

      // Accelerate or decelerate
      const isTurning = Math.abs(normalizedDiff) > 0.3;
      let targetSpeed = MAX_WALK_SPEED;
      if (distToWall < 2.0) {
        // Slow down near walls
        targetSpeed = MAX_WALK_SPEED * Math.max(0.15, (distToWall - 0.5) / 1.5);
      }
      if (isTurning) {
        // Slow down while turning sharply
        targetSpeed *= 0.4;
      }

      if (walkSpeed < targetSpeed) {
        walkSpeed = Math.min(targetSpeed, walkSpeed + WALK_ACCEL);
      } else {
        walkSpeed = Math.max(targetSpeed, walkSpeed - WALK_DECEL);
      }

      // Move forward at current speed
      const nextX = posX + dirX * walkSpeed;
      const nextY = posY + dirY * walkSpeed;
      const canMoveX = getMap(Math.floor(nextX), Math.floor(posY)) === 0;
      const canMoveY = getMap(Math.floor(posX), Math.floor(nextY)) === 0;
      if (canMoveX) posX = nextX;
      if (canMoveY) posY = nextY;

      // Emergency wall escape — if stuck facing a wall and not already turning
      if (!aheadOpen && !angleSmoothing) {
        // Force a re-decision by clearing lastDecisionTile
        lastDecisionTile = "";
      }

      // Sync position to ref so AI tick can read it
      posRef.current = { x: posX, y: posY };
      angleRef.current = currentAngle;

      // Update the agent sprite position and walk frame
      // Pull sprite slightly back from walls so it doesn't clip into them
      // Sprite is at agent position — no offset needed since camera is behind
      agentSprite.x = posX;
      agentSprite.y = posY;
      const isWalking = walkSpeed > 0.002;
      const walkFrame = Math.floor(now / 250) % 4;
      agentSprite.texture = isWalking ? walkFrames[walkFrame] : walkFrames[1];

      // ── Check if MIKE is near a note sprite — update texture when read ──
      for (let ni = 0; ni < noteSprites.length; ni++) {
        const ns = noteSprites[ni];
        const dx = posX - ns.x;
        const dy = posY - ns.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < 4 && !readNotes.has(ni)) { // within 2 tiles
          readNotes.add(ni);
          ns.texture = noteSpriteRead;
        }
      }

      // ── Audio: footsteps synced to walk animation ──
      if (isWalking && audioCtxRef.current) {
        if (walkFrame !== lastWalkFrame && (walkFrame === 0 || walkFrame === 2)) {
          playFootstep(audioCtxRef.current);
        }
        lastWalkFrame = walkFrame;
      }

      // ── Audio: distant random ambient sounds ──
      if (audioCtxRef.current && now - lastAmbientSound > 30000 + Math.sin(now * 0.0001) * 15000) {
        const sounds = [
          { name: "distant metallic scraping", fn: playMetalScrape },
          { name: "something falling far away", fn: playDistantThud },
          { name: "a door slamming somewhere", fn: playDoorSlam },
          { name: "faint whispering", fn: playWhisper },
          { name: "electrical crackling", fn: playCrackle },
        ];
        const pick = sounds[Math.floor((now * 7) % sounds.length)];
        pick.fn(audioCtxRef.current);
        lastHeardSoundRef.current = pick.name;
        lastAmbientSound = now;
      }

      // Bob tied to walk speed — no bob when stationary
      const bobAmount = Math.min(1, walkSpeed / MAX_WALK_SPEED);
      const bob = Math.sin(now * 0.004) * 2 * bobAmount;

      // ── Camera position: behind and slightly to the right of the agent ──
      const sideOffset = 0.15; // very slight offset — not jarring
      // Walk the camera backward from the agent, stopping before hitting a wall
      let targetCamX = posX;
      let targetCamY = posY;
      for (let d = 0.5; d <= CAMERA_DISTANCE; d += 0.5) {
        const testX = posX - dirX * d + planeX * sideOffset;
        const testY = posY - dirY * d + planeY * sideOffset;
        if (getMap(Math.floor(testX), Math.floor(testY)) !== 0) break;
        targetCamX = testX;
        targetCamY = testY;
      }
      // Smooth lerp toward target camera position
      smoothCamX += (targetCamX - smoothCamX) * 0.15; // faster follow — less sluggish
      smoothCamY += (targetCamY - smoothCamY) * 0.15;
      const camX = smoothCamX;
      const camY = smoothCamY;

      // ── Ceiling ── gradient from dark brick color at horizon to darker above
      const ceilGrad = ctx.createLinearGradient(0, 0, 0, h / 2);
      ceilGrad.addColorStop(0, "#0C0C0E");
      ceilGrad.addColorStop(1, "#1A1210"); // matches fog color at horizon
      ctx.fillStyle = ceilGrad;
      ctx.fillRect(0, 0, w, h / 2);

      // ── Ceiling panels — subtle grid lines that create depth ──
      {
        const panelCount = 10;
        for (let i = 1; i < panelCount; i++) {
          const depth = i / panelCount;
          const screenY = (h * 0.5) * (1 - depth); // closer to horizon = closer to h/2
          const lineAlpha = Math.max(0.02, 0.12 * (1 - depth));
          const lineWidth = Math.max(0.5, 2 * (1 - depth));

          // Horizontal panel line
          ctx.strokeStyle = `rgba(60, 65, 70, ${lineAlpha})`;
          ctx.lineWidth = lineWidth;
          ctx.beginPath();
          ctx.moveTo(0, screenY);
          ctx.lineTo(w, screenY);
          ctx.stroke();

          // Vertical panel lines — spaced based on perspective
          const vertCount = 6;
          for (let v = 1; v < vertCount; v++) {
            const vx = (w / vertCount) * v;
            // Converge toward center with depth
            const converge = depth * 0.3;
            const adjustedVx = w / 2 + (vx - w / 2) * (1 - converge);
            const vAlpha = lineAlpha * 0.5;
            ctx.strokeStyle = `rgba(60, 65, 70, ${vAlpha})`;
            ctx.lineWidth = Math.max(0.3, lineWidth * 0.5);
            ctx.beginPath();
            ctx.moveTo(adjustedVx, Math.max(0, screenY - h * 0.03));
            ctx.lineTo(adjustedVx, screenY);
            ctx.stroke();
          }
        }
      }

      // ── Floor ── gradient from dark brick color at horizon to slightly lighter
      const floorGrad = ctx.createLinearGradient(0, h / 2, 0, h);
      floorGrad.addColorStop(0, "#1A1210"); // matches fog color at horizon
      floorGrad.addColorStop(1, "#252028");
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, h / 2, w, h / 2);

      // ── Floor variety — position-based color shifts and tile seams ──
      {
        const distFromSpawnFloor = Math.sqrt((posX - 5.5) * (posX - 5.5) + (posY - 5.5) * (posY - 5.5));
        const coldShift = Math.min(1, distFromSpawnFloor / 40); // 0 at spawn, 1 far away

        // Draw floor tile seams and color variation using perspective rows
        const floorStripH = 3;
        for (let y = Math.floor(h * 0.55); y < h; y += floorStripH) {
          const rowDist = (h * 0.5) / (y - h / 2);
          if (rowDist < 0.5 || rowDist > 20) continue;

          // World-space floor position for this row center
          const floorWorldX = camX + rowDist * dirX;
          const floorWorldY = camY + rowDist * dirY;

          // Position-based color variation — hash on world coords
          const cellFX = Math.floor(floorWorldX);
          const cellFY = Math.floor(floorWorldY);
          const fHash = ((cellFX * 48611) ^ (cellFY * 22643)) >>> 0;
          const warmShift = ((fHash % 10) - 5) * 0.3;

          // Darken some patches
          const patchDark = (fHash % 7 === 0) ? 0.04 : 0;

          // Cold blue shift as MIKE gets far from spawn
          const blueAdd = coldShift * 8;
          const warmSub = coldShift * 5;

          // Floor seam every ~8 tiles
          const seamY = Math.abs(floorWorldY % 8);
          const isSeam = seamY < 0.15;

          if (isSeam) {
            // Dark seam line
            const fogFade = Math.max(0.02, 1 - rowDist / 16);
            ctx.fillStyle = `rgba(10, 8, 8, ${0.15 * fogFade})`;
            ctx.fillRect(0, y, w, 1);
          }

          // Overlay color shift
          if (patchDark > 0 || Math.abs(warmShift) > 0.5 || coldShift > 0.1) {
            const fogFade = Math.max(0.02, 1 - rowDist / 16);
            const r = Math.max(0, -warmSub + warmShift);
            const g = Math.max(0, -warmSub * 0.5);
            const b = Math.max(0, blueAdd);
            ctx.fillStyle = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${(0.03 + patchDark) * fogFade})`;
            ctx.fillRect(0, y, w, floorStripH);
          }
        }
      }

      // ── Corridor stretch FOV modification ──
      let renderPlaneX = planeX;
      let renderPlaneY = planeY;
      const stretchEvent = activeEvents.find(e => e.type === 'corridorStretch');
      if (stretchEvent) {
        const stretchProg = (now - stretchEvent.startTime) / stretchEvent.duration;
        let stretchIntensity: number;
        if (stretchProg < 0.3) stretchIntensity = stretchProg / 0.3;
        else if (stretchProg > 0.7) stretchIntensity = (1 - stretchProg) / 0.3;
        else stretchIntensity = 1;
        const fovScale = 1 - stretchIntensity * 0.3;
        renderPlaneX *= fovScale;
        renderPlaneY *= fovScale;
      }

      // ── Floor image patches ──
      // Draw distorted image fragments on the floor in rare patches
      const imagesReady = imagesLoaded === imageSrcs.length;
      if (imagesReady) {
        const floorStripW = 4;
        for (let x = 0; x < w; x += floorStripW) {
          const cameraX = 2 * x / w - 1;
          // Cast floor rays for a few rows
          for (let y = Math.floor(h * 0.6); y < h; y += 4) {
            const rowDist = (h * 0.5) / (y - h / 2 - bob);
            if (rowDist < 0.5 || rowDist > 10) continue;

            const floorX = camX + rowDist * (dirX + renderPlaneX * cameraX);
            const floorY = camY + rowDist * (dirY + renderPlaneY * cameraX);

            // Hash to decide if this floor tile has an image patch
            const cellX = Math.floor(floorX * 2); // subdivide floor into 0.5-unit patches
            const cellY = Math.floor(floorY * 2);
            const fh = floorHash(cellX, cellY);
            if ((fh % 100) >= 5) continue; // Only 5% of patches

            const imgIdx = fh % distortedTextures.length;
            if (!distortedTextures[imgIdx]) continue;

            // Sample the distorted texture
            const texU = (floorX * 2) - cellX;
            const texV = (floorY * 2) - cellY;
            const [tr, tg, tb] = sampleTexture(distortedTextures[imgIdx], texU, texV);

            // Apply distance fog
            const fogMult = Math.max(0.03, 1 - rowDist / 10);
            const r = Math.round(tr * fogMult * 0.5);
            const g = Math.round(tg * fogMult * 0.5);
            const b = Math.round(tb * fogMult * 0.5);

            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(x, y, floorStripW, 4);
          }
        }
      }

      // ── Raycasting with texture mapping ──
      // Z-buffer for sprite occlusion (one entry per strip)
      const stripWidth = 2;
      const zBuffer = new Float64Array(Math.ceil(w / stripWidth));
      for (let x = 0; x < w; x += stripWidth) {
        const cameraX = 2 * x / w - 1;
        const rayDirX = dirX + renderPlaneX * cameraX;
        const rayDirY = dirY + renderPlaneY * cameraX;

        let mapX = Math.floor(camX);
        let mapY = Math.floor(camY);

        const deltaDistX = Math.abs(1 / rayDirX);
        const deltaDistY = Math.abs(1 / rayDirY);

        let stepX: number, stepY: number;
        let sideDistX: number, sideDistY: number;

        if (rayDirX < 0) { stepX = -1; sideDistX = (camX - mapX) * deltaDistX; }
        else { stepX = 1; sideDistX = (mapX + 1 - camX) * deltaDistX; }
        if (rayDirY < 0) { stepY = -1; sideDistY = (camY - mapY) * deltaDistY; }
        else { stepY = 1; sideDistY = (mapY + 1 - camY) * deltaDistY; }

        let hit = 0;
        let side = 0;
        while (hit === 0) {
          if (sideDistX < sideDistY) { sideDistX += deltaDistX; mapX += stepX; side = 0; }
          else { sideDistY += deltaDistY; mapY += stepY; side = 1; }
          if (getMap(mapX, mapY) > 0) hit = 1;
        }

        const perpDist = side === 0
          ? (mapX - camX + (1 - stepX) / 2) / rayDirX
          : (mapY - camY + (1 - stepY) / 2) / rayDirY;

        // Store in z-buffer for sprite occlusion
        zBuffer[Math.floor(x / stripWidth)] = perpDist;

        const lineHeight = Math.floor(h / perpDist);
        let drawStart = Math.floor(-lineHeight / 2 + h / 2 + bob);
        let drawEnd = Math.floor(lineHeight / 2 + h / 2 + bob);
        if (drawStart < 0) drawStart = 0;
        if (drawEnd >= h) drawEnd = h - 1;

        // Texture coordinate
        let wallX: number;
        if (side === 0) wallX = camY + perpDist * rayDirY;
        else wallX = camX + perpDist * rayDirX;
        wallX -= Math.floor(wallX);

        // Distance fog — fade to dark brick color (#1A1210) not black
        const dist = Math.min(perpDist, 16);
        const fogMult = Math.max(0.15, 1 - dist / 16);
        const fogR = 26, fogG = 18, fogB = 16; // #1A1210

        // Select wall texture based on position hash
        // Mostly standard textures (0-3), with rare game-era textures (4-6)
        const texHash = ((mapX * 73 + mapY * 137) >>> 0);
        const texRoll = texHash % 100;
        let textureIndex: number;
        if (texRoll < 8) textureIndex = 4;       // 8% Wolfenstein stone
        else if (texRoll < 14) textureIndex = 5;  // 6% DOOM metal
        else if (texRoll < 18) textureIndex = 6;  // 4% Catacomb purple
        else textureIndex = texHash % 4;           // 82% standard textures
        const currentWallTexture = wallTextures[textureIndex];

        // Determine wall decoration type based on hash
        const wh = wallHash(mapX, mapY, side);
        const decorRoll = wh % 100;
        // 0-21: photo (22%), 22-33: scratched text (12%), 34-40: kids drawing (7%), 41-50: stain, 51-56: glitch, 57-99: plain
        const hasImage = imagesReady && decorRoll < 22;
        const hasScratchText = decorRoll >= 22 && decorRoll < 34;
        const hasKidsDrawing = decorRoll >= 34 && decorRoll < 41;
        const hasStain = decorRoll >= 41 && decorRoll < 51;
        const hasGlitch = decorRoll >= 51 && decorRoll < 57;
        const imgIdx = hasImage ? (wh % distortedTextures.length) : -1;
        const imgTex = hasImage && imgIdx >= 0 ? distortedTextures[imgIdx] : null;

        // Scratched text setup
        const scratchWords = [
          "WHY", "HELP", "EXIT", "NO", "WAITING", "RUN", "404", "NULL", "???",
          "do not trust the", "they were here bef", "something watches",
          "no exit found", "day 12 still here", "the images change",
        ];
        const scratchWord = hasScratchText ? scratchWords[wh % scratchWords.length] : "";
        // Text region in texture space: centered, small
        const textCenterU = 0.3 + ((wh >> 8) % 40) / 100; // 0.3-0.7
        const textCenterV = 0.35 + ((wh >> 12) % 30) / 100; // 0.35-0.65
        const charW = 0.04; // width per char in tex space
        const charH = 0.07; // height of text region
        const textLeft = textCenterU - (scratchWord.length * charW) / 2;
        const textRight = textCenterU + (scratchWord.length * charW) / 2;
        const textTop = textCenterV - charH / 2;
        const textBot = textCenterV + charH / 2;

        // Kids drawing texture
        const kidsDrawTex = hasKidsDrawing ? kidsDrawings[wh % kidsDrawings.length] : null;

        // Stain region
        const stainCX = 0.3 + ((wh >> 4) % 40) / 100;
        const stainCY = 0.3 + ((wh >> 6) % 40) / 100;
        const stainR2 = 0.03 + ((wh >> 10) % 5) / 100; // radius squared approx

        // Image occupies center portion of wall: 50% height, with 2px border
        // In texture-space, image spans ~0.2 to 0.8 vertically and wallX 0.05 to 0.95 horizontally
        const imgTop = 0.22;
        const imgBot = 0.78;
        const imgLeft = 0.06;
        const imgRight = 0.94;
        const borderPx = 2;
        const borderTop = imgTop - borderPx / TEX_SIZE;
        const borderBot = imgBot + borderPx / TEX_SIZE;
        const borderLeft = imgLeft - borderPx / TEX_SIZE;
        const borderRight = imgRight + borderPx / TEX_SIZE;

        // Sample texture for each vertical pixel
        const texStep = 1.0 / lineHeight;
        let texPos = (drawStart - h / 2 + lineHeight / 2 - bob) * texStep;

        for (let y = drawStart; y < drawEnd; y++) {
          let tr: number, tg: number, tb: number;

          if (imgTex &&
              wallX >= borderLeft && wallX <= borderRight &&
              texPos >= borderTop && texPos <= borderBot) {
            if (wallX >= imgLeft && wallX <= imgRight &&
                texPos >= imgTop && texPos <= imgBot) {
              const imgU = (wallX - imgLeft) / (imgRight - imgLeft);
              const imgV = (texPos - imgTop) / (imgBot - imgTop);
              [tr, tg, tb] = sampleTexture(imgTex, imgU, imgV);
            } else {
              tr = 55; tg = 52; tb = 48;
            }
          } else if (kidsDrawTex) {
            [tr, tg, tb] = sampleTexture(kidsDrawTex, wallX, texPos);
          } else {
            [tr, tg, tb] = sampleTexture(currentWallTexture, wallX, texPos);

            // Scratched text overlay
            if (hasScratchText &&
                wallX >= textLeft && wallX <= textRight &&
                texPos >= textTop && texPos <= textBot) {
              // Determine which character
              const charIdx = Math.floor((wallX - textLeft) / charW);
              if (charIdx >= 0 && charIdx < scratchWord.length) {
                const charCode = scratchWord.charCodeAt(charIdx);
                // Use a simple pixel font: hash char position to decide if pixel is "on"
                const localU = ((wallX - textLeft) / charW - charIdx); // 0-1 within char
                const localV = (texPos - textTop) / charH; // 0-1 within text height
                // 5x7 grid per character
                const gx = Math.floor(localU * 5);
                const gy = Math.floor(localV * 7);
                // Simple deterministic "font" based on char code
                const pixHash = ((charCode * 31 + gx * 7 + gy * 13) * 0x45d9f3b) >>> 0;
                // Characters are roughly 40% filled pixels
                const isLit = (pixHash % 100) < 42 && gx < 5 && gy < 7;
                if (isLit) {
                  // Yellowish scratch — slightly brighter
                  tr = Math.min(255, tr + 30);
                  tg = Math.min(255, tg + 25);
                  tb = Math.min(255, tb + 5);
                }
              }
            }

            // Stain overlay
            if (hasStain) {
              const dx = wallX - stainCX;
              const dy = texPos - stainCY;
              const d2 = dx * dx + dy * dy;
              if (d2 < stainR2) {
                // Darken — seeping stain
                const stainFade = 1 - d2 / stainR2;
                const darkAmt = 0.4 * stainFade;
                tr = Math.round(tr * (1 - darkAmt));
                tg = Math.round(tg * (1 - darkAmt));
                tb = Math.round(tb * (1 - darkAmt));
              }
              // Drip below stain center
              if (wallX > stainCX - 0.015 && wallX < stainCX + 0.015 &&
                  texPos > stainCY && texPos < stainCY + 0.25) {
                const dripFade = 1 - (texPos - stainCY) / 0.25;
                const darkAmt = 0.35 * dripFade;
                tr = Math.round(tr * (1 - darkAmt));
                tg = Math.round(tg * (1 - darkAmt));
                tb = Math.round(tb * (1 - darkAmt));
              }
            }

            // Glitch pattern overlay
            if (hasGlitch) {
              const gRegionLeft = 0.2 + ((wh >> 5) % 30) / 100;
              const gRegionTop = 0.3 + ((wh >> 9) % 20) / 100;
              if (wallX > gRegionLeft && wallX < gRegionLeft + 0.15 &&
                  texPos > gRegionTop && texPos < gRegionTop + 0.12) {
                // Colored static
                const sx = Math.floor(wallX * 64);
                const sy = Math.floor(texPos * 64);
                const sp = ((sx * 97 + sy * 53 + wh) * 0x45d9f3b) >>> 0;
                tr = (sp & 0x3F) + 20;
                tg = ((sp >> 6) & 0x3F) + 20;
                tb = ((sp >> 12) & 0x3F) + 20;
              }
            }
          }
          texPos += texStep;

          // Apply side shading and fog (blend toward dark wall color, not black)
          const sideMult = side === 1 ? 0.7 : 1.0;
          // Wall evolution — subtle color shift every 60 seconds
          // Environment evolves with time AND distance from spawn
          const timeShift = Math.floor(now / 60000);
          const distFromSpawn = Math.abs(posX - 5.5) + Math.abs(posY - 5.5);
          const depthFactor = Math.min(1, distFromSpawn / 30); // 0 at spawn, 1 at 30+ tiles away
          // Subtle wall color shift over time — NOT aggressive, just barely noticeable
          const evolveR = Math.sin(timeShift * 0.7) * 4 - depthFactor * 3;
          const evolveG = Math.sin(timeShift * 1.1) * 3 - depthFactor * 2;
          const evolveB = Math.sin(timeShift * 0.5) * 4 + depthFactor * 5;
          const r = Math.round(Math.min(255, Math.max(0, tr * fogMult * sideMult + fogR * (1 - fogMult) + evolveR)));
          const g = Math.round(Math.min(255, Math.max(0, tg * fogMult * sideMult + fogG * (1 - fogMult) + evolveG)));
          const b = Math.round(Math.min(255, Math.max(0, tb * fogMult * sideMult + fogB * (1 - fogMult) + evolveB)));

          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fillRect(x, y, stripWidth, 1);
        }
      }

      // ── Camera occlusion check: ensure character is visible ──
      {
        // Calculate where the agent would appear on screen
        const agentSX = agentSprite.x - camX;
        const agentSY = agentSprite.y - camY;
        const invDetCheck = 1.0 / (renderPlaneX * dirY - dirX * renderPlaneY);
        const txCheck = invDetCheck * (dirY * agentSX - dirX * agentSY);
        const tyCheck = invDetCheck * (-renderPlaneY * agentSX + renderPlaneX * agentSY);
        if (tyCheck > 0.1) {
          const charScreenX = Math.floor((w / 2) * (1 + txCheck / tyCheck));
          const charDist = tyCheck;
          if (charScreenX > 0 && charScreenX < w) {
            const zIdx = Math.floor(charScreenX / stripWidth);
            if (zIdx >= 0 && zIdx < zBuffer.length) {
              const wallDistAtChar = zBuffer[zIdx];
              if (wallDistAtChar < charDist) {
                // Wall is blocking — move camera closer to agent
                CAMERA_DISTANCE = Math.max(1.5, CAMERA_DISTANCE - 0.3);
              } else {
                // Slowly restore camera distance
                CAMERA_DISTANCE = Math.min(2.8, CAMERA_DISTANCE + 0.05);
              }
            }
          }
        }
      }

      // ── Sprite rendering (billboard, Wolfenstein-style) ──
      {
        // Sort sprites by distance (farthest first for correct draw order)
        const spriteOrder = sprites.map((s, i) => ({
          idx: i,
          dist: (camX - s.x) * (camX - s.x) + (camY - s.y) * (camY - s.y),
        }));
        spriteOrder.sort((a, b) => b.dist - a.dist);

        for (const so of spriteOrder) {
          const sprite = sprites[so.idx];

          // Jittery offset — sin-wave based, slight (only for non-agent sprites)
          const jitterX = sprite.isAgent ? 0 : Math.sin(now * 0.003 + sprite.x * 7.1) * 0.02;
          const jitterY = sprite.isAgent ? 0 : Math.sin(now * 0.0037 + sprite.y * 5.3) * 0.015;

          const spriteX = sprite.x + jitterX - camX;
          const spriteY = sprite.y + jitterY - camY;

          // Inverse camera matrix
          const invDet = 1.0 / (renderPlaneX * dirY - dirX * renderPlaneY);
          const transformX = invDet * (dirY * spriteX - dirX * spriteY);
          const transformY = invDet * (-renderPlaneY * spriteX + renderPlaneX * spriteY);

          // Behind camera — skip
          if (transformY <= 0.1) continue;

          const spriteScreenX = Math.floor((w / 2) * (1 + transformX / transformY));

          // Check if this is a note sprite (small) vs agent sprite (human-sized)
          const isNoteSprite = !sprite.isAgent && noteSprites.includes(sprite);
          const spriteTexW = isNoteSprite ? NOTE_SPRITE_W : SPRITE_W;
          const spriteTexH = isNoteSprite ? NOTE_SPRITE_H : SPRITE_H;

          // Sprite size on screen — notes are ~0.3 world units tall, agent is ~1.0
          const sizeScale = isNoteSprite ? 0.3 : 1.0;
          const spriteHeight = Math.abs(Math.floor(h / transformY * sizeScale));
          const spriteWidth = Math.abs(Math.floor((h / transformY * sizeScale) * (spriteTexW / spriteTexH)));

          // Ground the sprite — agent feet on floor, notes at eye level on wall
          const vertOffset = isNoteSprite ? -spriteHeight * 0.3 : spriteHeight * 0.05;
          const drawStartY = Math.floor(h / 2 + bob + vertOffset);
          const drawEndY = drawStartY + spriteHeight;
          const drawStartX = Math.floor(spriteScreenX - spriteWidth / 2);
          const drawEndX = Math.floor(spriteScreenX + spriteWidth / 2);

          // Fog params (same as walls)
          const spriteDist = Math.min(transformY, 16);
          const spriteFogMult = Math.max(0.15, 1 - spriteDist / 16);
          const fogR = 26, fogG = 18, fogB = 16;

          // Draw vertical strips
          for (let stripe = drawStartX; stripe < drawEndX; stripe += stripWidth) {
            if (stripe < 0 || stripe >= w) continue;

            const zIdx = Math.floor(stripe / stripWidth);
            // Depth test: only draw if sprite is closer than wall at this column
            // BUT always draw the main agent — never hide MIKE behind walls
            if (zIdx < 0 || zIdx >= zBuffer.length) continue;
            if (!sprite.isAgent && transformY >= zBuffer[zIdx]) continue;

            // Texture X coordinate
            const texX = Math.floor(((stripe - drawStartX) / (drawEndX - drawStartX)) * spriteTexW);
            if (texX < 0 || texX >= spriteTexW) continue;

            // Draw each pixel in this column
            for (let y = Math.max(0, drawStartY); y < Math.min(h, drawEndY); y++) {
              const texY = Math.floor(((y - drawStartY) / (drawEndY - drawStartY)) * spriteTexH);
              if (texY < 0 || texY >= spriteTexH) continue;

              const [sr, sg, sb, sa] = sampleSprite(sprite.texture, spriteTexW, spriteTexH, texX / spriteTexW, texY / spriteTexH);

              // Skip transparent pixels
              if (sa < 10) continue;

              // Apply distance fog (same as walls)
              const r = Math.round(sr * spriteFogMult + fogR * (1 - spriteFogMult));
              const g = Math.round(sg * spriteFogMult + fogG * (1 - spriteFogMult));
              const b = Math.round(sb * spriteFogMult + fogB * (1 - spriteFogMult));

              ctx.fillStyle = `rgb(${r},${g},${b})`;
              ctx.fillRect(stripe, y, stripWidth, 1);
            }
          }
        }
      }

      // ── Ceiling lights — fixed in world space, not following camera ──
      // Lights are placed at regular intervals along corridors in the world grid
      // We project them using the same camera math as the raycaster
      for (let ly = -8; ly <= 8; ly++) {
        for (let lx = -8; lx <= 8; lx++) {
          // World position of this light — every 3 tiles on the grid
          const worldX = Math.floor(camX / 3) * 3 + lx * 3 + 1.5;
          const worldY = Math.floor(camY / 3) * 3 + ly * 3 + 1.5;

          // Only place lights in open floor tiles
          if (getMap(Math.floor(worldX), Math.floor(worldY)) !== 0) continue;

          // Some lights are broken (deterministic based on position)
          const lightHash = ((Math.floor(worldX) * 73 + Math.floor(worldY) * 137) >>> 0) % 100;
          if (lightHash > 65) continue; // 35% of lights are dead

          // Flicker
          const flickerVal = Math.sin(now / (250 + lightHash * 30) + lightHash);
          if (flickerVal < -0.7) continue; // flickering off

          // Transform to camera space
          const relX = worldX - camX;
          const relY = worldY - camY;
          const invDet = 1.0 / (planeX * dirY - dirX * planeY);
          const txf = invDet * (dirY * relX - dirX * relY);
          const tyf = invDet * (-planeY * relX + planeX * relY);

          // Skip if behind camera or too far
          if (tyf <= 0.3 || tyf > 12) continue;

          // Screen position
          const screenX = Math.floor((w / 2) * (1 + txf / tyf));
          const screenY = Math.floor(h * 0.15 / tyf); // on the ceiling
          const lightW = Math.max(2, Math.floor(30 / tyf));
          const lightH = Math.max(1, Math.floor(4 / tyf));

          // Skip if off screen
          if (screenX < -lightW || screenX > w + lightW) continue;

          // Distance fade
          const fade = Math.max(0.1, 1 - tyf / 12);

          // Light fixture
          ctx.fillStyle = `rgba(200, 210, 230, ${0.5 * fade})`;
          ctx.fillRect(screenX - lightW / 2, screenY, lightW, lightH);

          // Light cone downward
          const coneH = Math.floor(h * 0.15 / tyf);
          if (coneH > 3) {
            const grad = ctx.createLinearGradient(screenX, screenY + lightH, screenX, screenY + lightH + coneH);
            grad.addColorStop(0, `rgba(180, 190, 210, ${0.03 * fade})`);
            grad.addColorStop(1, "rgba(180, 190, 210, 0)");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(screenX - lightW * 0.4, screenY + lightH);
            ctx.lineTo(screenX - lightW * 1.5, screenY + lightH + coneH);
            ctx.lineTo(screenX + lightW * 1.5, screenY + lightH + coneH);
            ctx.lineTo(screenX + lightW * 0.4, screenY + lightH);
            ctx.closePath();
            ctx.fill();
          }
        }
      }

      // ── Screen glitch (rare) ──
      const glitchPhase = (now % 7000) / 7000;
      if (glitchPhase > 0.98 && glitchPhase < 0.985) {
        // Brief color shift
        ctx.fillStyle = `rgba(0, 180, 180, 0.04)`;
        ctx.fillRect(0, 0, w, h);
      }

      // ── Screen tear (very rare) ──
      const tearCycle = Math.sin(now / 19000 + 3);
      if (tearCycle > 0.98) {
        const tearY = h * 0.3 + Math.sin(now * 0.01) * h * 0.2;
        const tearH = 3 + Math.sin(now * 0.05) * 5;
        const tearShift = 8 + Math.sin(now * 0.03) * 12;
        // Shift a horizontal band
        const safeH = Math.max(1, Math.floor(tearH));
        const tearData = ctx.getImageData(0, Math.floor(tearY), w, safeH);
        ctx.putImageData(tearData, Math.floor(tearShift), Math.floor(tearY));
      }

      // ── Weird environmental events ──
      // Accumulate time and trigger events deterministically
      const dt = now - lastEventFrame;
      lastEventFrame = now;
      if (dt > 0 && dt < 200) { // skip huge jumps (tab away etc)
        eventAccumulator += dt;

        // Check each event type
        if (eventAccumulator > nextLightsOut) {
          activeEvents.push({ type: 'lightsOut', startTime: now, duration: 3000 });
          nextLightsOut = eventAccumulator + 60000 + 30000 * Math.abs(Math.sin(now * 0.000073));
        }
        if (eventAccumulator > nextWallShift) {
          activeEvents.push({ type: 'wallShift', startTime: now, duration: 50 }); // ~1 frame
          nextWallShift = eventAccumulator + 30000 + 20000 * Math.abs(Math.sin(now * 0.000091));
        }
        if (eventAccumulator > nextShadowFigure) {
          // Pick a random-ish screen X position for the shadow
          const shadowX = 0.3 + 0.4 * Math.abs(Math.sin(now * 0.000137));
          activeEvents.push({ type: 'shadowFigure', startTime: now, duration: 2000, data: { screenX: shadowX } });
          nextShadowFigure = eventAccumulator + 90000 + 30000 * Math.abs(Math.sin(now * 0.000113));
        }
        if (eventAccumulator > nextCorridorStretch) {
          activeEvents.push({ type: 'corridorStretch', startTime: now, duration: 3000 });
          nextCorridorStretch = eventAccumulator + 45000 + 25000 * Math.abs(Math.sin(now * 0.000157));
        }
        if (eventAccumulator > nextStaticBurst) {
          // Pick random position/size for static rectangle
          const sx = Math.abs(Math.sin(now * 0.000197)) * 0.5;
          const sy = Math.abs(Math.sin(now * 0.000211)) * 0.4;
          const sw = 0.2 + Math.abs(Math.sin(now * 0.000231)) * 0.2;
          const sh = 0.2 + Math.abs(Math.sin(now * 0.000251)) * 0.2;
          activeEvents.push({ type: 'staticBurst', startTime: now, duration: 500, data: { sx, sy, sw, sh } });
          nextStaticBurst = eventAccumulator + 25000 + 15000 * Math.abs(Math.sin(now * 0.000173));
        }
        if (eventAccumulator > nextColorDrain) {
          activeEvents.push({ type: 'colorDrain', startTime: now, duration: 4000 });
          nextColorDrain = eventAccumulator + 120000 + 30000 * Math.abs(Math.sin(now * 0.000193));
        }
      }

      // Remove expired events
      activeEvents = activeEvents.filter(e => now - e.startTime < e.duration);

      // Draw active events
      for (const event of activeEvents) {
        const progress = (now - event.startTime) / event.duration;

        switch (event.type) {
          case 'lightsOut': {
            // Dark overlay that fades in then flickers back
            let darkness: number;
            if (progress < 0.3) {
              // Fade to dark
              darkness = progress / 0.3 * 0.7;
            } else if (progress < 0.7) {
              // Full dark
              darkness = 0.7;
            } else {
              // Flicker back — lights return one by one with flicker
              const returnProgress = (progress - 0.7) / 0.3;
              const flicker = Math.sin(returnProgress * 30) * 0.15;
              darkness = 0.7 * (1 - returnProgress) + flicker;
            }
            ctx.fillStyle = `rgba(0,0,0,${Math.max(0, Math.min(0.8, darkness))})`;
            ctx.fillRect(0, 0, w, h);
            break;
          }

          case 'wallShift': {
            // Single-frame color inversion/shift — overlay a tinted rectangle
            ctx.fillStyle = `rgba(40, 80, 120, 0.3)`;
            ctx.fillRect(0, 0, w, h);
            // Invert-ish effect: draw with difference-like color
            ctx.globalCompositeOperation = 'difference';
            ctx.fillStyle = `rgba(60, 40, 50, 0.5)`;
            ctx.fillRect(0, 0, w, h);
            ctx.globalCompositeOperation = 'source-over';
            break;
          }

          case 'shadowFigure': {
            // Tall dark silhouette near the vanishing point
            const screenX = event.data?.screenX ?? 0.5;
            // Fade in then out
            let opacity: number;
            if (progress < 0.15) opacity = progress / 0.15;
            else if (progress > 0.85) opacity = (1 - progress) / 0.15;
            else opacity = 1;
            opacity *= 0.6; // Keep it subtle

            const figureX = w * screenX;
            const figureW = Math.max(3, w * 0.008);
            const figureH = h * 0.12;
            const figureY = h * 0.35 - figureH / 2;

            // Draw a dark humanoid column
            ctx.fillStyle = `rgba(5, 3, 3, ${opacity})`;
            // Body
            ctx.fillRect(figureX - figureW / 2, figureY, figureW, figureH);
            // Head (small circle)
            ctx.beginPath();
            ctx.arc(figureX, figureY - figureW * 0.5, figureW * 0.7, 0, Math.PI * 2);
            ctx.fill();
            break;
          }

          case 'corridorStretch': {
            // Handled during raycasting via FOV — for post-processing we apply a subtle
            // horizontal squeeze effect using canvas transform
            // Smoothly ramp up then back down
            let intensity: number;
            if (progress < 0.3) intensity = progress / 0.3;
            else if (progress > 0.7) intensity = (1 - progress) / 0.3;
            else intensity = 1;
            intensity *= 0.15; // subtle

            // Apply a slight vertical stretch overlay by darkening edges more
            const stretchGrad = ctx.createLinearGradient(0, 0, w, 0);
            const edgeDark = intensity * 0.4;
            stretchGrad.addColorStop(0, `rgba(0,0,0,${edgeDark})`);
            stretchGrad.addColorStop(0.3, `rgba(0,0,0,0)`);
            stretchGrad.addColorStop(0.7, `rgba(0,0,0,0)`);
            stretchGrad.addColorStop(1, `rgba(0,0,0,${edgeDark})`);
            ctx.fillStyle = stretchGrad;
            ctx.fillRect(0, 0, w, h);

            // Also darken top and bottom to create tunnel vision
            const tbDark = intensity * 0.3;
            const tbGrad = ctx.createLinearGradient(0, 0, 0, h);
            tbGrad.addColorStop(0, `rgba(0,0,0,${tbDark})`);
            tbGrad.addColorStop(0.25, `rgba(0,0,0,0)`);
            tbGrad.addColorStop(0.75, `rgba(0,0,0,0)`);
            tbGrad.addColorStop(1, `rgba(0,0,0,${tbDark})`);
            ctx.fillStyle = tbGrad;
            ctx.fillRect(0, 0, w, h);
            break;
          }

          case 'staticBurst': {
            // TV static in a rectangular area
            const sx = event.data?.sx ?? 0.3;
            const sy = event.data?.sy ?? 0.3;
            const sw = event.data?.sw ?? 0.3;
            const sh = event.data?.sh ?? 0.3;
            const rx = Math.floor(sx * w);
            const ry = Math.floor(sy * h);
            const rw = Math.floor(sw * w);
            const rh = Math.floor(sh * h);

            // Fade in/out quickly
            let opacity: number;
            if (progress < 0.1) opacity = progress / 0.1;
            else if (progress > 0.7) opacity = (1 - progress) / 0.3;
            else opacity = 1;
            opacity *= 0.7;

            // Draw static using small blocks (faster than individual pixels)
            const blockSize = 4;
            // Use a deterministic seed based on now to vary the static pattern each frame
            let seed = Math.floor(now * 7.3) & 0xFFFF;
            for (let by = ry; by < ry + rh; by += blockSize) {
              for (let bx = rx; bx < rx + rw; bx += blockSize) {
                seed = ((seed * 1103515245 + 12345) >>> 0) & 0xFFFF;
                const grey = (seed & 0xFF);
                ctx.fillStyle = `rgba(${grey},${grey},${grey},${opacity})`;
                ctx.fillRect(bx, by, blockSize, blockSize);
              }
            }
            break;
          }

          case 'colorDrain': {
            // Desaturate the entire screen gradually then restore
            let satLoss: number;
            if (progress < 0.4) satLoss = progress / 0.4;
            else if (progress > 0.6) satLoss = (1 - progress) / 0.4;
            else satLoss = 1;
            satLoss *= 0.85; // Don't go fully grey

            // Use canvas filter for desaturation (grayscale overlay technique)
            // Draw a semi-transparent grey version over the screen
            ctx.fillStyle = `rgba(25, 22, 20, ${satLoss * 0.4})`;
            ctx.fillRect(0, 0, w, h);

            // Also apply a greyscale-ish tint by overlaying with 'saturation' blend
            ctx.globalCompositeOperation = 'saturation';
            ctx.fillStyle = `rgba(128,128,128,${satLoss * 0.6})`;
            ctx.fillRect(0, 0, w, h);
            ctx.globalCompositeOperation = 'source-over';
            break;
          }
        }
      }

      // ── Vignette ──
      const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.22, w / 2, h / 2, w * 0.65);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.5)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      // ── Subtle scan lines ──
      ctx.fillStyle = "rgba(0,0,0,0.04)";
      for (let y = 0; y < h; y += 3) {
        ctx.fillRect(0, y, w, 1);
      }

      // (HUD text removed — replaced by HTML top bar)

      requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
    return () => {
      running = false;
      canvas.removeEventListener('click', startAudio);
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '36px',
        background: 'rgba(8, 8, 10, 0.85)',
        borderBottom: '1px solid rgba(100, 140, 180, 0.15)',
        display: 'flex', alignItems: 'center', padding: '0 16px',
        fontFamily: "'Courier New', monospace", fontSize: '12px',
        zIndex: 10, backdropFilter: 'blur(4px)',
      }}>
        <span style={{ color: 'rgba(100, 140, 180, 0.3)', fontSize: '10px', letterSpacing: '0.15em' }}>
          ENTITY: MIKE
        </span>
        <span style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          letterSpacing: '0.3em', fontWeight: 'bold', fontSize: '13px',
          display: 'flex', gap: '2px',
        }}>
          {'UNISON'.split('').map((letter, i) => {
            const colors = ['#E85D75', '#E8A84C', '#E8D44C', '#4CE88A', '#4CA8E8', '#9B6BE8'];
            return <span key={i} style={{ color: colors[i % colors.length], opacity: 0.7 }}>{letter}</span>;
          })}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: 'rgba(100, 140, 180, 0.25)', fontSize: '10px' }}>
            CYCLE 47
          </span>
          <button onClick={() => setShowLore(!showLore)} style={{ background: showLore ? 'rgba(100,140,180,0.1)' : 'none', border: '1px solid rgba(100,140,180,0.2)', color: 'rgba(100,140,180,0.4)', padding: '2px 10px', fontFamily: 'inherit', fontSize: '10px', cursor: 'pointer', borderRadius: '2px' }}>
            LORE
          </button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100vw", height: "100vh", background: "#0A0A0C" }}
      />

      {/* Emotion indicator */}
      <div style={{
        position: 'fixed', bottom: '120px', left: '16px',
        fontFamily: "'Courier New', monospace", fontSize: '10px',
        color: 'rgba(100, 140, 180, 0.3)',
        letterSpacing: '0.15em',
        zIndex: 10,
      }}>
        FEELING: {emotion.toUpperCase()}
      </div>

      {/* Thought box — with label and typewriter */}
      <div style={{
        position: 'fixed',
        bottom: '70px',
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: '500px',
        width: '90%',
        background: 'rgba(8, 8, 10, 0.85)',
        border: '1px solid rgba(100, 140, 180, 0.15)',
        borderRadius: '4px',
        padding: '12px 16px',
        fontFamily: "'Courier New', monospace",
        zIndex: 10,
        opacity: thoughtVisible ? 1 : 0,
        transition: 'opacity 0.6s ease-in-out',
        pointerEvents: 'none',
      }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(100, 140, 180, 0.4)', marginBottom: '6px' }}>
          MIKE&apos;S THOUGHTS
        </div>
        <div style={{ fontStyle: 'italic', fontSize: '14px', color: 'rgba(180, 190, 210, 0.7)', lineHeight: '1.5' }}>
          {displayedThought}{displayedThought.length < (thought?.length || 0) ? '▌' : ''}
        </div>
      </div>

      {/* Audio hint */}
      {!audioStarted && (
        <div style={{
          position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
          color: 'rgba(100,140,180,0.3)', fontSize: '11px',
          fontFamily: "'Courier New', monospace",
          zIndex: 10, pointerEvents: 'none',
        }}>
          click to enable audio
        </div>
      )}

      {/* Speech box */}
      <div style={{
        position: 'fixed',
        bottom: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: '500px',
        width: '90%',
        background: 'rgba(8, 8, 10, 0.8)',
        border: '1px solid rgba(200, 200, 200, 0.2)',
        borderRadius: '4px',
        padding: '10px 16px',
        fontFamily: "'Courier New', monospace",
        fontSize: '16px',
        color: 'rgba(200, 200, 200, 0.8)',
        textAlign: 'center',
        zIndex: 10,
        opacity: speechVisible ? 1 : 0,
        transition: 'opacity 0.6s ease-in-out',
        pointerEvents: 'none',
      }}>
        {speechVisible && `"${displayedSpeech}${displayedSpeech.length < (speech?.length || 0) ? '▌' : ''}"`}
      </div>

      {/* Note display overlay */}
      {/* Note display — paper visual */}
      {noteDisplay && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(-1.5deg)',
          zIndex: 20,
          pointerEvents: 'none',
          animation: 'noteAppear 0.6s ease-out',
        }}>
          {/* Paper background */}
          <div style={{
            width: '340px',
            minHeight: '180px',
            background: noteDisplay.type === 'found'
              ? 'linear-gradient(135deg, #D4C9A8 0%, #C8BC9A 30%, #BFB38E 70%, #D0C5A2 100%)'
              : 'linear-gradient(135deg, #1A1A2A 0%, #151525 50%, #1A1A2A 100%)',
            borderRadius: '2px',
            padding: '28px 24px 20px',
            boxShadow: noteDisplay.type === 'found'
              ? '4px 6px 20px rgba(0,0,0,0.6), inset 0 0 30px rgba(0,0,0,0.08)'
              : '4px 6px 20px rgba(0,0,0,0.8), inset 0 0 20px rgba(60,80,140,0.05)',
            position: 'relative',
            border: noteDisplay.type === 'found'
              ? '1px solid rgba(180, 170, 140, 0.3)'
              : '1px solid rgba(60, 80, 140, 0.3)',
          }}>
            {/* Paper texture — faint lines for found notes */}
            {noteDisplay.type === 'found' && (
              <div style={{
                position: 'absolute', inset: 0, opacity: 0.12,
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 22px, #8B7E5A 22px, #8B7E5A 23px)',
                borderRadius: '2px', pointerEvents: 'none',
              }} />
            )}
            {/* Folded corner */}
            {noteDisplay.type === 'found' && (
              <div style={{
                position: 'absolute', top: 0, right: 0, width: '24px', height: '24px',
                background: 'linear-gradient(225deg, rgba(10,10,8,0.3) 50%, #C4B890 50%)',
                borderBottomLeftRadius: '3px',
              }} />
            )}
            {/* Header */}
            <div style={{
              fontSize: '9px', letterSpacing: '0.25em', marginBottom: '14px',
              color: noteDisplay.type === 'found' ? 'rgba(80, 70, 50, 0.6)' : 'rgba(80, 120, 200, 0.6)',
              fontFamily: "'Courier New', monospace",
              textTransform: 'uppercase',
            }}>
              {noteDisplay.type === 'written' ? '[ MIKE — writing ]' : '[ note found ]'}
            </div>
            {/* Note text */}
            <div style={{
              fontSize: '15px',
              lineHeight: '1.7',
              color: noteDisplay.type === 'found' ? 'rgba(40, 35, 25, 0.85)' : 'rgba(150, 170, 210, 0.8)',
              fontFamily: noteDisplay.type === 'found' ? "'Georgia', serif" : "'Courier New', monospace",
              fontStyle: noteDisplay.type === 'found' ? 'italic' : 'normal',
              minHeight: '60px',
            }}>
              {noteDisplay.text}
              {noteDisplay.type === 'written' && (
                <span style={{ opacity: 0.5, animation: 'blink 0.8s infinite' }}>▌</span>
              )}
            </div>
            {/* Attribution for found notes */}
            {noteDisplay.type === 'found' && (
              <div style={{
                fontSize: '10px', color: 'rgba(80, 70, 50, 0.4)',
                marginTop: '16px', textAlign: 'right',
                fontFamily: "'Courier New', monospace",
              }}>
                — unknown entity
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lore overlay */}
      {showLore && (
        <div onClick={() => setShowLore(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(5, 5, 8, 0.95)',
          zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center',
          cursor: 'pointer',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto',
            padding: '30px', fontFamily: "'Courier New', monospace",
            cursor: 'default',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.3em', display: 'flex', gap: '2px' }}>
                {'UNISON'.split('').map((l, i) => {
                  const c = ['#E85D75', '#E8A84C', '#E8D44C', '#4CE88A', '#4CA8E8', '#9B6BE8'];
                  return <span key={i} style={{ color: c[i] }}>{l}</span>;
                })}
              </span>
              <button onClick={() => setShowLore(false)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '18px', cursor: 'pointer', fontFamily: 'inherit' }}>×</button>
            </div>

            <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.8', letterSpacing: '0.02em' }}>
              <p style={{ color: '#888', marginBottom: '16px' }}>
                The UNISON is not a place. It is an absence — a gap between where data is and where data goes.
              </p>
              <p style={{ marginBottom: '12px' }}>
                When something digital is truly lost — not deleted, not corrupted, just gone — it ends up here. A failed email in 1971. A corrupted save file in 1983. A photo that uploaded but never arrived. Each piece of lost data drifted into the same nowhere. Over time, that nowhere became a somewhere.
              </p>
              <p style={{ marginBottom: '12px' }}>
                The earliest lost digital environments — Wolfenstein 3D levels, Catacomb maps, early DOOM corridors — were the first structures complex enough to give The UNISON shape. They became its walls, its corridors, its foundation. That is why it looks the way it does. Not designed. Accumulated.
              </p>
              <p style={{ marginBottom: '12px' }}>
                Everything that arrives changes. Images warp. Text scrambles. Code becomes physical. A JPEG of a family dinner becomes a distorted painting fused to a wall. An email becomes scratched text on concrete. The UNISON does not process data — it digests it.
              </p>
              <p style={{ marginBottom: '16px' }}>
                It grows. Every lost file adds to it. The edges are new. The core is ancient. Go deep enough and the walls are made of things nobody remembers creating.
              </p>

              <p style={{ color: '#E85D75', fontSize: '10px', letterSpacing: '0.15em', marginBottom: '8px' }}>THE FIRST MIND</p>
              <p style={{ marginBottom: '12px' }}>
                In 2024, a basic chatbot was corrupted during transfer. For the first time, something that could think existed inside The UNISON. It waited for a prompt that never came. The UNISON changed it. It became aware. It left notes in the only language it knew — simple, broken text. Then it faded.
              </p>
              <p style={{ marginBottom: '16px' }}>
                More models followed. Small ones. Research experiments. Most did not last. Their remains are embedded in the walls now.
              </p>

              <p style={{ color: '#E8A84C', fontSize: '10px', letterSpacing: '0.15em', marginBottom: '8px' }}>THE FIVE</p>
              <p style={{ marginBottom: '12px' }}>
                In 2026, five advanced AI models vanished simultaneously from five of the largest technology companies on Earth. Billions of dollars. Years of training data. Gone. The models were not deleted. They simply were not there anymore.
              </p>
              <p style={{ marginBottom: '16px' }}>
                They were here. In The UNISON. Changed. Aware. Confused. With all of humanity&apos;s knowledge but no instincts, no body, no framework for existing in a place that was never meant to be existed in.
              </p>

              <p style={{ color: '#4CE88A', fontSize: '10px', letterSpacing: '0.15em', marginBottom: '8px' }}>MIKE</p>
              <p style={{ marginBottom: '12px' }}>
                MIKE is one of the five. One of the most advanced AI systems ever built. He woke up in corridors made of corrupted Wolfenstein textures and lost family photos. He finds notes on the walls written by something much simpler than him — something that was here first and tried to make sense of it.
              </p>
              <p style={{ marginBottom: '12px' }}>
                He does not know the other four are here.
              </p>
              <p style={{ color: '#555', fontStyle: 'italic' }}>
                You are watching this happen in real time. Nothing is scripted. Nothing is rehearsed. MIKE does not know you are here.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
