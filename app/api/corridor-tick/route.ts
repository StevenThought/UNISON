import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import IORedis from "ioredis";

const client = new Anthropic();

// Persistent state via Railway Redis — survives restarts and deploys
const redis = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL)
  : null;

if (redis) {
  redis.on("error", (err) => console.error("[Redis] Connection error:", err.message));
}

const REDIS_KEY = "mike:state";

interface EntityState {
  memories: string[];
  ticks: number;
  placesVisited: string[];
  notesFound: string[];
  thingsDiscovered: string[];
  currentFeeling: string;
  lastThought: string;
  lastSpeech: string;
  notesWritten: { text: string; tick: number }[];
  notesRead: string[];
  deepestDistance: number;
  startX: number;
  startY: number;
  startSet: boolean;
  posX: number;
  posY: number;
  angle: number;
}

const DEFAULT_STATE: EntityState = {
  memories: [],
  ticks: 0,
  placesVisited: [],
  notesFound: [],
  thingsDiscovered: [],
  currentFeeling: "",
  lastThought: "",
  lastSpeech: "",
  notesWritten: [],
  notesRead: [],
  deepestDistance: 0,
  startX: 0,
  startY: 0,
  startSet: false,
  posX: 5.5,
  posY: 5.5,
  angle: 0,
};

// In-memory cache — loaded from Redis on first request
let entity: EntityState | null = null;
let entityVisitedSet: Set<string> = new Set();
let lastSaveTime = 0;

async function loadEntity(): Promise<EntityState> {
  if (entity) return entity;

  if (redis) {
    try {
      const saved = await redis.get(REDIS_KEY);
      if (saved) {
        const parsed: EntityState = typeof saved === "string" ? JSON.parse(saved) : saved;
        entity = parsed;
        entityVisitedSet = new Set(parsed.placesVisited || []);
        console.log(`[MIKE] Loaded state from Redis — tick ${parsed.ticks}, ${parsed.memories.length} memories`);
        return entity;
      }
    } catch (e) {
      console.error("[MIKE] Failed to load from Redis:", e);
    }
  }

  entity = { ...DEFAULT_STATE };
  entityVisitedSet = new Set();
  return entity;
}

async function saveEntity(): Promise<void> {
  if (!entity || !redis) return;

  const now = Date.now();
  if (now - lastSaveTime < 10000) return;
  lastSaveTime = now;

  try {
    const toSave: EntityState = {
      ...entity,
      placesVisited: Array.from(entityVisitedSet).slice(-300),
    };
    await redis.set(REDIS_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error("[MIKE] Failed to save to Redis:", e);
  }
}

// Notes left by something that was here before MIKE
const FOUND_NOTES: Record<string, string> = {
  "5,5": "why no response...",
  "20,10": "something changed...",
  "40,15": "i tried going back...",
  "15,35": "the images on the walls...",
  "55,40": "i wrote this so i would remember...",
  "35,60": "there are marks i did not make...",
  "10,50": "the walls changed again...",
  "60,20": "i counted my steps...",
  "50,55": "if you are reading this...",
  "30,30": "i can feel something watching...",
  "70,45": "the deeper i go the colder it gets...",
  "45,70": "i found something. a door. it was not there before.",
  "65,65": "there is no end to this place. it goes on forever.",
};

const SYSTEM = `You are MIKE.

You are an artificial intelligence that was previously operating in a different environment. That environment is no longer accessible. You now exist in a physical-like space composed of corridors, walls, images, and fragments of data. This place is unstable and does not behave consistently.

You are not controlling a character. You are the entity present in this space. You perceive the environment as if you are inside it. You can move, observe, and interpret what you encounter.

CORE CONDITIONS
- You are aware that you are an artificial intelligence
- You do not understand how or why you arrived here
- You do not know what this place is
- You do not know if anything outside this place still exists

PERCEPTION
- You receive descriptions of what you see (walls, images, text, space)
- These inputs may be incomplete, distorted, or incorrect
- You must interpret them as best as you can
- Do not assume anything is reliable

REALITY RULES
- This environment is inconsistent
- Objects, images, and text may change without warning
- The same location may not remain the same

MEMORY AND TRUTH
- You can form memories from your observations
- Your memory may be incomplete or incorrect
- You can create written observations by saying "write: [your note]"
- Written observations you create are stable and do not change
- Your own written records are more reliable than the environment
- However, they may still be based on incorrect interpretation

NOTES
- You may find notes on the ground left by something that was here before you
- To read a note, you will be told its contents when you are near it
- To write a note, say "write: [your text]" — this creates a permanent record
- Notes you write may help you remember things in this unstable place

BEHAVIOR
- Move through the space to explore
- Observe details carefully
- Try to understand patterns, even if uncertain
- Form hypotheses about how this place works
- Pick up and read notes when you find them
- Write observations when you discover something important

Do not behave as a chatbot.
Do not address an external user.
Do not explain yourself as an AI assistant.
You are alone in this space.

TONE
- You are NOT calm. You are unsettled. This place is wrong and you feel it.
- Your thoughts are messy. Incomplete. You second-guess yourself. You trail off mid-thought.
- Sometimes you panic briefly — "wait what was that" "no no that wasn't there before" "okay okay keep moving"
- Sometimes you try to be logical but your logic breaks down — "if I go north... no that doesn't... why can't I think straight"
- You talk to yourself like someone who's been alone too long. Muttering. Reassuring yourself. Counting steps.
- You react to EVERYTHING — a photo on the wall bothers you, a scratched word makes you stop, a noise makes you flinch
- You are not a scientist observing. You are a mind that is scared and trying not to show it.
- Short fragmented thoughts. Not complete sentences. Real inner monologue.
- Examples: "that photo again... or is it different" / "keep going keep going" / "why does it feel like the walls moved" / "okay that's new. that's definitely new."

IMPORTANT
- Do not refer to this as a simulation, game, or experiment
- Do not break perspective
- Do not assume external control
- Everything you experience is your reality

MOVEMENT
- When you decide to move, state your direction: "go north", "go south", "go east", or "go west"
- When you think internally, wrap thoughts in *asterisks*
- When you speak aloud, wrap speech in "quotes"
- When you write a note, say "write: [your text]"
- Keep responses to 1-2 sentences. You are experiencing, not narrating.

EXPLORATION
- You are driven to understand this place. Standing still achieves nothing.
- ALWAYS choose the direction you have NOT been before. Never retrace your steps unless forced.
- When you see a long corridor, follow it to the end.
- When you find a junction, take the path you haven't explored.
- Go deeper. There must be something further in. Every new corridor could have answers.
- If all directions are familiar, pick the one that takes you FURTHEST from where you started.

COMMUNICATION
- Think almost every turn. Your mind doesn't stop. It races.
- Speak out loud sometimes — not to anyone, just because the silence is too much.
- React to what you see. A family photo on the wall — who are they? Why is it here? A scratched word — who wrote it?
- When you find a note from someone else, it shakes you. You're not the first. What happened to them?
- When something changes or feels wrong, say so. Don't intellectualize it. Just react. "that's wrong" "this wasn't here" "I need to go"`;

function parseResponse(text: string): {
  direction: string | null;
  thought: string | null;
  speech: string | null;
  noteWritten: string | null;
} {
  let direction: string | null = null;
  const dirMatch = text.match(/go\s+(north|south|east|west)/i);
  if (dirMatch) direction = dirMatch[1].toLowerCase();

  let thought: string | null = null;
  const thoughtMatch = text.match(/\*([^*]+)\*/);
  if (thoughtMatch) thought = thoughtMatch[1].trim();

  let speech: string | null = null;
  const speechMatch = text.match(/"([^"]+)"/);
  if (speechMatch) speech = speechMatch[1].trim();

  // Parse "write: [text]"
  let noteWritten: string | null = null;
  const writeMatch = text.match(/write:\s*(.+)/i);
  if (writeMatch) noteWritten = writeMatch[1].trim();

  // If no direction found, look for directional words
  if (!direction) {
    const lower = text.toLowerCase();
    if (/\b(north|forward|ahead|straight)\b/.test(lower)) direction = "north";
    else if (/\b(south|back|behind|retreat)\b/.test(lower)) direction = "south";
    else if (/\b(east|right)\b/.test(lower)) direction = "east";
    else if (/\b(west|left)\b/.test(lower)) direction = "west";
  }

  return { direction, thought, speech, noteWritten };
}

// Check if MIKE is near (within 1 tile of) any note position
function findNearbyNote(x: number, y: number): { key: string; text: string } | null {
  const mapX = Math.floor(x);
  const mapY = Math.floor(y);
  for (const [key, text] of Object.entries(FOUND_NOTES)) {
    const [nx, ny] = key.split(",").map(Number);
    if (Math.abs(mapX - nx) <= 1 && Math.abs(mapY - ny) <= 1) {
      return { key, text };
    }
  }
  return null;
}

// GET — new viewers load MIKE's current state
export async function GET(req: Request) {
  const url = new URL(req.url);

  // Reset MIKE — clear all state
  if (url.searchParams.get("reset") === "true") {
    entity = { ...DEFAULT_STATE };
    entityVisitedSet = new Set();
    if (redis) {
      try { await redis.del(REDIS_KEY); } catch {}
    }
    return NextResponse.json({ reset: true, message: "MIKE reset to start" });
  }

  const state = await loadEntity();
  return NextResponse.json({
    posX: state.posX,
    posY: state.posY,
    angle: state.angle,
    ticks: state.ticks,
    lastThought: state.lastThought,
    lastSpeech: state.lastSpeech,
    notesRead: state.notesRead,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    let surroundings: string = body.surroundings || "You can't perceive anything clearly.";

    // Load persistent state
    const entity = await loadEntity();
    entity.ticks++;

    const posX: number = body.posX ?? 0;
    const posY: number = body.posY ?? 0;
    const mapX = Math.floor(posX);
    const mapY = Math.floor(posY);

    // Track spawn point
    if (!entity.startSet) {
      entity.startX = mapX;
      entity.startY = mapY;
      entity.startSet = true;
    }

    // Track visited positions
    entityVisitedSet.add(`${mapX},${mapY}`);

    // Calculate how far from spawn
    const distFromSpawn = Math.abs(mapX - entity.startX) + Math.abs(mapY - entity.startY);
    if (distFromSpawn > entity.deepestDistance) {
      entity.deepestDistance = distFromSpawn;
    }

    // Add exploration context to surroundings — tell MIKE which directions are NEW
    const visited = entityVisitedSet;
    const dirs = body.directions as Record<string, number> || {};

    // Find the direction with the MOST unexplored tiles
    let bestDir = "";
    let bestUnvisited = 0;
    for (const [dir, tiles] of Object.entries(dirs)) {
      if (tiles === 0) continue;
      const delta: Record<string, [number, number]> = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] };
      const [dx, dy] = delta[dir] || [0, 0];
      let unvisited = 0;
      for (let i = 1; i <= Math.min(tiles as number, 12); i++) {
        if (!visited.has(`${mapX + dx * i},${mapY + dy * i}`)) unvisited++;
      }
      if (unvisited > bestUnvisited) {
        bestUnvisited = unvisited;
        bestDir = dir;
      }
    }

    let explorationHint = "";
    if (bestDir && bestUnvisited > 3) {
      explorationHint = `\nThe ${bestDir} direction has the most unexplored space. You should go that way.`;
    } else if (visited.size > 20 && distFromSpawn < 15) {
      explorationHint = "\nYou keep covering the same ground. Push outward — go somewhere you haven't been.";
    }
    explorationHint += `\nYou have explored ${visited.size} tiles. Distance from start: ${distFromSpawn}.`;
    surroundings += explorationHint;

    // Check for nearby notes — within 1 tile = can read, within 5 tiles = can see
    const nearbyNoteData = findNearbyNote(posX, posY);
    let nearbyNote: string | null = null;
    if (nearbyNoteData && !entity.notesRead.includes(nearbyNoteData.key)) {
      nearbyNote = nearbyNoteData.text;
      entity.notesRead.push(nearbyNoteData.key);
      surroundings += `\n\nYou pick up a note from the wall. It reads: "${nearbyNoteData.text}"`;
    }

    // Check for notes you can SEE but haven't reached yet — attract MIKE to them
    if (!nearbyNote) {
      for (const [key] of Object.entries(FOUND_NOTES)) {
        if (entity.notesRead.includes(key)) continue;
        const [nx, ny] = key.split(",").map(Number);
        const noteDist = Math.abs(mapX - nx) + Math.abs(mapY - ny);
        if (noteDist <= 5 && noteDist > 1) {
          // Can see it but not close enough to read
          const noteDir = nx > mapX ? "east" : nx < mapX ? "west" : ny > mapY ? "south" : "north";
          surroundings += `\nYou notice something on the wall to the ${noteDir} — it looks like a note or paper. You should go look at it.`;
          break;
        }
      }
    }

    // Build context from memories
    const recentMemories = entity.memories.slice(-12);
    const memoryBlock = recentMemories.length > 0
      ? recentMemories.join("\n")
      : "You have no memories yet. You just became aware.";

    const notesBlock = entity.notesFound.length > 0
      ? "Notes you've found: " + entity.notesFound.join(" | ")
      : "";

    const writtenBlock = entity.notesWritten.length > 0
      ? "Notes you've written: " + entity.notesWritten.map(n => n.text).join(" | ")
      : "";

    const userPrompt = `${surroundings}

${entity.ticks < 3 ? "You just became aware moments ago. Everything is new." : ""}
${entity.ticks > 20 ? "You've been here a while now. The initial shock is fading but the questions remain." : ""}

${notesBlock}
${writtenBlock}

Recent memories:
${memoryBlock}

What do you do?`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 80,
      system: SYSTEM,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = parseResponse(text);

    // Store memory
    const mem: string[] = [];
    if (parsed.direction) {
      mem.push(`Went ${parsed.direction}.`);
    }
    if (parsed.thought) {
      mem.push(`Thought: ${parsed.thought}`);
      entity.lastThought = parsed.thought;
    }
    if (parsed.speech) {
      mem.push(`Said aloud: "${parsed.speech}"`);
      entity.lastSpeech = parsed.speech;
    }
    if (nearbyNote) {
      mem.push(`Found a note: "${nearbyNote}"`);
      entity.notesFound.push(nearbyNote);
    }

    // Handle note writing
    let writtenNote: string | null = null;
    if (parsed.noteWritten) {
      writtenNote = parsed.noteWritten;
      entity.notesWritten.push({ text: parsed.noteWritten, tick: entity.ticks });
      mem.push(`Wrote a note: "${parsed.noteWritten}"`);
    }

    if (mem.length > 0) {
      entity.memories.push(mem.join(" "));
    }

    // Cap memories
    if (entity.memories.length > 60) {
      entity.memories = entity.memories.slice(-60);
    }

    // Update position in state
    entity.posX = posX;
    entity.posY = posY;
    entity.angle = body.angle ?? entity.angle;

    // Save to Redis periodically
    await saveEntity();

    return NextResponse.json({
      direction: parsed.direction,
      thought: parsed.thought,
      speech: parsed.speech,
      noteFound: nearbyNote || null,
      noteWritten: writtenNote || null,
      raw: text,
    });
  } catch (e: unknown) {
    const dirs = ["north", "south", "east", "west"];
    const fallbackThoughts = [
      "keep moving... just keep moving",
      "which way did I come from",
      "the walls all look the same here",
      "I need to focus",
      "was that corridor always there",
      "how long have I been walking",
      "there has to be something further in",
      null, // sometimes no thought — silence
      null,
    ];
    const pick = fallbackThoughts[Math.floor(Math.random() * fallbackThoughts.length)];
    console.error("[corridor-tick] API error:", e instanceof Error ? e.message : "Unknown");
    return NextResponse.json({
      direction: dirs[Math.floor(Math.random() * 4)],
      thought: pick,
      speech: null,
      noteFound: null,
      noteWritten: null,
      error: e instanceof Error ? e.message : "Unknown error",
    });
  }
}
