# My Thoughts and Tasks

## 🧠 Brain Dump (Unstructured Thoughts)
- Segregating scene from explaination like first easy explaination as multiple steps and then taking those to generate scene with multiple steps for each explaination ?
- Can I add kafka somewhere here ?
- Will we ever require RAG and vector db ?
- Can we also add a question round before directly going to scene generation for better understanding from user ?
- Can we use something like langchain to orchestrate all of this ?
- Can we use something like redis to store intermediate results ?
- Can we use something like celery to handle background tasks ?
- Can I build a playground for users to be able to generate the visuals manually without using AI ?
- The core tension: system-diagram uses a full-snapshot model — the entire components + connections array must be repeated in every action. For the main-architecture visual appearing in all 6 steps, that's 7 complete copies (initialStates + 6 steps) of the same large JSON structure with only status/active fields changing.
Three realistic options, ordered by effort:
Option A — Better few-shot example (cheap, do now)
The current example only shows array and text-badge — trivially simple types. Add a system-diagram example showing 2-3 steps with actual components/connections arrays. The model needs to SEE the pattern.
Option B — Pre-define the component skeleton in Stage 1 (medium)
Stage 0 reasoning already knows the architecture (Orchestrator, Toolbox, User, Output). Have Stage 1 encode the component list in the hint field for system-diagram visuals:
"hint": "Components: user(mobile), orchestrator(compute), toolbox(layers). Connections: user→orchestrator, orchestrator→toolbox, toolbox→orchestrator"
Then Stage 2's visualParamsGuide injection reads that hint and pre-populates the base structure. Stage 2 only needs to say "make orchestrator active" rather than regenerate the entire structure.
Option C — Delta model for system-diagram (big, renderer change)
Instead of full snapshots, actions only send what changed ({ "setStatus": { "orchestrator": "active" } }). Eliminates the repetition entirely but requires renderer changes.
My recommendation: Do Option A immediately (30 min), then Option B as a Phase 33 item. Option C is a larger architectural decision. Want me to implement Option A now — add a proper multi-step system-diagram few-shot example to the prompt?


## 🚀 Active Focus (What I'm working on right now)
- [ ] Fix broken generation pipeline
- [ ] Fix broken positioning system

## 💡 Ideas / Future Enhancements
- Better server for handling ai requests
- Better observability for ai generation
- Interactive Mode — Button-Triggered Visual Mutations
- Hover Tooltips and Right-Click Context Menu on Canvas Elements
- Different Node Types for Git (Branch vs Commit vs Tag)
- Canvas API / WebGL Rendering for Complex Scenes
- Complex Call-Stack Frame
- Timeline / Sequence Diagram
- String / Text-Stream Visualizer
- Improve WASM initialization times by caching Pyodide via a `CacheFirst` strategy using `@serwist/next`, which is currently uninstalled
- Multiple themes (light, dark, high contrast, etc.)

## ❓ Questions / Blockers
- Will we be able to optimize token consumptions ?
- Should we optimize scene json more to be focused more on differences and other optimization ?
