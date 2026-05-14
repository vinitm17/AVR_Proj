Core Design Principles
1. One Primary Accent Color

Do NOT use:

purple + blue + green + orange + pink everywhere

Pick:

1 accent color
1 danger color
neutrals

Example:

Primary: emerald / blue
Danger: red
Background: slate/zinc neutrals

Good apps:

Stripe
Linear
Notion
Vercel

They feel premium because color is restrained.

2. Never Use Gradient Text

This instantly screams:

AI-generated dashboard

Gradients are okay:

very subtle backgrounds
hero sections
charts occasionally

But NOT:

headings
buttons
dashboard labels
3. Emojis Are Not Icons

This:

📍 Find Charger
⚡ Start Charging
💰 Wallet

looks amateur.

Use proper icon libraries:

Lucide
Heroicons
Tabler

Example:

MapPin
Zap
Wallet
BatteryCharging

Icons should be:

same stroke width
same visual weight
monochrome mostly
4. Reduce Border Radius

AI slop UIs use:

rounded-full everywhere

Use:

rounded-xl
rounded-2xl max

Infrastructure apps should feel structured.

5. Use Gray Properly

Beginners use:

pure black (#000)
pure white (#fff)

Real apps use softened neutrals:

zinc
slate
neutral
stone

Tailwind example:

bg-zinc-950
text-zinc-200
border-zinc-800

Looks 10x more premium.

6. Visual Hierarchy > Decoration

User should instantly know:

charger status
start/stop button
wallet balance
active session

Everything else secondary.

If everything is colorful:
nothing is important.

7. Avoid Huge Shadows

AI-generated UIs love:

shadow-2xl blur-[100px]

Real dashboards use:

subtle borders
light shadows
layering via spacing
8. Consistent Spacing System

Most important hidden rule.

Use:

4px base grid

Meaning spacing values:

p-2
p-4
p-6
gap-4
gap-6

Avoid random:

padding: 13px
margin: 27px

Consistency feels professional subconsciously.

9. Limit Fonts

Use:

1 font family
2 weights mostly

Usually enough:

medium
semibold

Avoid:

ultra bold headings
5 font weights
fancy fonts

Good choices:

Inter
Geist
Manrope
10. Status Colors Must Be Predictable

Always follow conventions:

Status	Color
Active	Green
Charging	Blue/Green
Fault	Red
Idle	Gray
Warning	Yellow

Never invent random mappings.

11. Avoid Centered Dashboards

Centered dashboards look like landing pages.

Real products:

left aligned
grid based
information dense
12. Don't Overanimate

Avoid:

floating cards
bouncing buttons
constant glow effects

Good animations:

fast
subtle
functional

Examples:

hover fade
modal transition
loading shimmer
13. Data Density Matters

Infrastructure dashboards SHOULD contain information.

Too much empty space:

looks like a dribbble shot

not a real app.

14. Use Cards Carefully

AI slop:

card inside card inside card

Better:

sections
separators
tables
spacing

Not everything needs a card.

15. Tables Are Better Than Fancy Lists

Admin panels especially.

Use:

sortable tables
filters
status badges

Instead of giant colorful tiles.

16. Prioritize States

Most juniors design:

happy path only

You need:

loading states
empty states
offline states
charger unavailable state
insufficient coins state
payment failed state

This is what makes apps feel real.

17. Avoid Fancy Names

Don't call things:

PowerX Ultra Charging Experience

Call it:

Charging Session

Industrial software uses boring clarity.

18. Mobile First Means Thumb Reachability

Your key button:

Start Charging

should be:

bottom reachable
large enough
impossible to miss

Because users may literally stand beside a charger outdoors.

19. Use Realistic Copy

Avoid:

Initiate Your Charging Journey

Use:

Start Charging

Avoid startup-marketing language in utility apps.

20. Consistency Beats Creativity

You do NOT need:

unique buttons everywhere
different card styles
fancy interactions