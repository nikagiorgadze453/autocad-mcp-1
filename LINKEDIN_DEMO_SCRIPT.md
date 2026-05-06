# LinkedIn Demo Script — AutoCAD MCP

## Recording Flow

Target length: 45–75 seconds.

### 1. Opening Shot — Existing Parcel

Run:

```bash
node demo_linkedin_recording.cjs before
```

Show the irregular parcel boundary in AutoCAD.

Overlay text:

```text
Existing AutoCAD parcel boundary
```

### 2. Prompt Shot — Cursor

Show the prompt/request in Cursor:

```text
Generate a 12-flat residential general plan inside this exact parcel.
Keep roads, parking, buildings and K1/K2/K3 inside the boundary.
```

Overlay text:

```text
AI reads the real DWG context
```

### 3. Result Reveal — AutoCAD

Run:

```bash
node demo_linkedin_recording.cjs after
```

Show the completed plan.

Overlay text:

```text
12 flats + road + parking + K1/K2/K3
```

### 4. Detail Zooms

Slow pan or zoom through:

- 2 residential blocks
- separated 6 m road
- parking row
- Georgian labels
- K1/K2/K3 table

Overlay text:

```text
Everything stays inside the parcel
```

### 5. Closing Shot

End on the full parcel with the completed scheme visible.

Overlay text:

```text
From boundary to general plan in minutes
```

## Suggested Voiceover

```text
I connected AutoCAD to Cursor through MCP and gave the agent an existing parcel
boundary from a real DWG.

Instead of drawing a random site, it used the actual shape, placed a 12-flat
residential scheme inside it, separated road and parking from the buildings,
and calculated K1, K2 and K3.

This is still experimental, but it already feels like a new way to explore
early-stage urban and architectural layouts.
```

## LinkedIn Caption

```text
Testing an AutoCAD + AI workflow inside Cursor.

I gave the agent an existing DWG parcel boundary and asked it to create a
12-flat residential general plan inside the exact shape.

It generated:
• 2 residential blocks
• internal road
• parking
• Georgian labels
• K1 / K2 / K3 calculations

The important part: it works inside the actual AutoCAD context, not on a random
blank canvas.

Still experimental, but this is already changing how I think about early-stage
architectural planning.
```
