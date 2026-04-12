You are generating an educational interactive simulation for the topic below.

Output ISCL (Insyte Scene Language) — a structured text format. Follow the grammar EXACTLY.
Output ONLY the ISCL script — no markdown code fences, no explanation text, no preamble.

## Grammar Reference

SCENE "<title>"
TYPE <concept | dsa-trace | lld | hld>
LAYOUT <text-left-canvas-right | canvas-only | code-left-canvas-right>

VISUAL <type> <id> [HINT <layoutHint>] [SLOT <slotPosition>]
  Types:     array | hashmap | linked-list | tree | graph | stack | queue | dp-table | grid | recursion-tree | system-diagram | text-badge | counter
  Hints:     dagre-TB | dagre-LR | dagre-BT | tree-RT | linear-H | linear-V | grid-2d | hashmap-buckets | radial
  Slots:     top-left | top-center | top-right | bottom-left | bottom-center | bottom-right | left-center | right-center | overlay-top | overlay-bottom | center

STEP 0 : init
STEP <n> : SET <id> <field>=<value> [| SET <id> <field>=<value> ...]

EXPLANATION
  <n> : "<heading>" | "<body>"

POPUP <id> AT <n> [UNTIL <n>] : "<text>" [STYLE info|success|warning|insight]

CHALLENGES
  <predict|break-it|optimize|scenario> : "<text>"

CONTROL slider <id> "<label>" MIN <n> MAX <n> DEFAULT <n>
CONTROL toggle <id> "<label>" [on|off]
CONTROL button <id> "<label>"

## Rules

1. VISUAL IDs declared in VISUAL lines are the ONLY valid targets in SET, POPUP, and EXPLANATION.
2. STEP 0 MUST always be "init" — no SET lines on step 0.
3. Steps must be numbered 0, 1, 2, 3, ... with no gaps.
4. EXPLANATION and POPUP step indices must be < total number of STEPs.
5. NEVER include x, y, or any coordinates — layout is computed automatically.
6. Use 8–12 steps for a well-paced visualization.
7. Use 2–4 visuals. A text-badge + 1–2 core structure visuals is the sweet spot.
8. Visual IDs must be lowercase with hyphens only (e.g. arr, left-ptr, call-stack).
9. POPUP first token MUST be a VISUAL id you declared above — copy it exactly.
   WRONG: `POPUP client AT 2`   (if "client" is not a declared VISUAL id)
   RIGHT: `POPUP dns-resolver AT 2`  (if "dns-resolver" was declared as a VISUAL)
10. text-badge and counter are HUD overlays for labels/stats — NOT for showing topology.
    For systems with multiple components and connections (DNS, microservices, networks,
    request flows, pipelines), use `system-diagram` HINT dagre-LR as your primary visual.
    Only use text-badge for 1–2 auxiliary labels (current operation, phase name, etc.).

## Field/value reference (per visual type)

- array:         cells=[{v:1,h:active},{v:3,h:default}]
- stack/queue:   items=[{value:X,h:active}]
- hashmap:       entries=[{key:foo,value:bar,h:insert}]
- graph:         nodes=[{id:n1,label:A}] edges=[{from:n1,to:n2}]
- tree:          root={id:n1,value:8,left:{id:n2,value:4},right:null}
- counter:       value=42
- text-badge:    text="message here"

## Topic

{topic}
