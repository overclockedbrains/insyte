# 🤖 insyte — AI Strategy & Cost Management

> The "Live Tutor" vision, the hybrid caching model, and how we handle AI costs for Milestone 1.

---

## 🌟 The Vision: A Live Interactive AI Tutor

insyte isn't just a platform for viewing pre-generated animations. It is a **live AI tutor with a visual whiteboard**. 

Users don't just consume the animation; they converse with it and manipulate it through natural language:
- **"Add 50 more elements to the hash table, I want to see the performance degrade."** → AI live-updates the simulation parameters and dataset.
- **"The collision animation looks slightly off, it should chain instead of probe."** → AI issues a patch to correct the simulation strategy on the fly.
- **"Can you zoom into the hash function part? Show me the math."** → AI generates a sub-simulation inline.
- **"Compare this side-by-side with a B-Tree."** → AI splits the canvas and generates a comparison visualization.

This level of dynamic interaction requires live AI calls, which fundamentally changes our approach to caching and costs.

---

## 🏗️ The Hybrid Caching Model

Since live chat and dynamic modifications kill traditional "cache everything" approaches, we use a 3-layered hybrid model:

### Layer 1: The CACHED BASE (Instant, $0 Cost)
When a user searches "How does DNS work?", they are served a pre-generated, fully functional simulation from our cache. 
- **What's included:** The complete scene graph, standard interactive controls, pre-written explanation text, and step-synced popups.
- **Cost:** $0. (Served from a CDN).
- **Benefit:** Instant initial load and immediate "wow" factor.

### Layer 2: PRE-BUILT CONTROLS (Live, No AI, $0 Cost)
Many "modifications" don't actually require AI. The UI provides physical controls (sliders, toggles) that map to simulation parameters.
- **Examples:** Adjusting animation speed, increasing dataset size, toggling algorithms, pausing/stepping.
- **Benefit:** Handles ~60-70% of user modifications instantly without burning API tokens.

### Layer 3: LIVE AI CHAT (The Premium Magic)
When the user types a custom request ("Compare this with X" or "Explain this line of code"), the AI is invoked to generate a JSON diff/patch or a targeted text response.
- **Cost:** ~$0.001 - $0.003 per interaction (depending on context size).
- **Usage:** Typically ~3-5 calls per engaged session.

---

## 💰 Milestone 1: Cost Management & Tiered Access

For the initial launch (Milestone 1), our goal is maximum user acquisition with minimum friction, while protecting against runaway API bills.

### The Plan for Milestone 1:

**1. Default Experience:** Let users try it for free with our keys.
- We cover the cost of the base AI interactions to reduce friction.
- We will leverage generous free tiers (e.g., Google Gemini Flash, which offers 1M tokens/day for free) to power the default generations and live chat.
- Rate limits applied: e.g., 10-15 live AI chat interactions per user per day.

**2. Bring Your Own Key (BYOK) for Power Users:**
- We provide a straightforward Settings panel where users can paste their own API keys (OpenAI, Anthropic, Gemini, Groq).
- Users can select which model they want to power their Live Tutor.
- **Benefit:** Unlocks unlimited modifications, advanced model access (like Claude 3.5 Sonnet or GPT-4o), and offloads the token cost entirely from our infrastructure.

---

## 🧮 Honest Cost Breakdown (Live Mode)

If a user utilizes the Live AI Chat, the AI processes the current scene JSON as context and returns a patch.

| User Action | Approx. Tokens | Cost (Cheap Model, e.g. Gemini Flash) |
|-------------|----------------|---------------------------------------|
| Initial Generation (Cache Miss) | ~5K Total | ~$0.003 |
| Live Diff: "Add elements" | ~4K Total | ~$0.001 |
| Live Chat: "Explain this differently" | ~3.5K Total | ~$0.001 |
| Live Diff: Side-by-side comparison | ~6K Total | ~$0.004 |

**Estimated Cost per Live Session (Assuming 1 Gen + 3 Live Diffs):** `~$0.006 per session.`

If we scale to 10,000 monthly users and we pay for all default interactions on a cheap/free tier:
- Using Gemini Flash Free Tier: **Effectively $0**.
- Using paid cheap APIs: **~$60/month max out of pocket.**

This structure guarantees that we can launch to a massive audience without financial anxiety, while preserving the "magic" of a live, intelligent tutor.
