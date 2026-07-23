# Design System Strategy: The Curated Atmosphere

## 1. Overview & Creative North Star
The objective of this design system is to transcend the "utility-first" appearance of standard mobile applications, moving instead toward a **"Digital Gallery"** aesthetic. The Creative North Star for this system is **Architectural Fluidity**.

In high-end event curation, space is as important as the objects within it. We treat the viewport as a physical environment where depth is created through light and shadow rather than rigid lines. By utilizing intentional asymmetry, high-contrast typographic scales, and a "borderless" philosophy, we create an experience that feels curated and structured. This system rejects the generic grid in favor of a sophisticated, editorial layout that balances functional density with visual clarity.

---

### 2. Colors & Surface Philosophy

The color palette is anchored in high-contrast prestige. We use deep architectural tones paired with warm, organic highlights to evoke a sense of exclusive hospitality.

#### The "No-Line" Rule
**Explicit Instruction:** The use of 1px solid borders for sectioning or containment is strictly prohibited.
Boundaries must be defined through:
- **Surface Hierarchy:** Utilizing background shifts (e.g., a `surface-container-low` component sitting on a `surface` background).
- **Negative Space:** Using the spacing scale to create "implied" containers.
- **Tonal Transitions:** Using soft gradients to guide the eye from one content area to the next.

#### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use the Material surface tiers to define importance:
- **Base Layer:** `surface` (#FFFFFF) or `surface_container_lowest` (#FFFFFF) for the primary background.
- **Secondary Sections:** `surface_container_low` (#f3f3f4) to subtly distinguish content groups.
- **Interactive Elements:** `primary_container` (#1F2A44) for high-impact navy surfaces.

#### The "Glass & Gradient" Rule
To achieve a premium "signature" look, we employ **Glassmorphism**. For floating overlays (modals, navigation bars), use `surface_bright` with a 60% opacity and a 20px-30px backdrop blur.

**Signature Texture:** Main CTAs and Hero sections must use a 135-degree linear gradient transitioning from the deep primary tone (#1F2A44) to the primary container. This creates a subtle "inner glow" that flat color cannot replicate.

---

### 3. Typography
Our typography creates an architectural rhythm. We pair the geometric stability of **Public Sans** with the functional clarity of **Inter**.

- **Public Sans (Headlines/Display):** Used for "The Statement." High contrast in scale is mandatory. `display-lg` should be used asymmetrically to anchor the page, often overlapping background elements or imagery.
- **Inter (Functional/Data):** Used for "The Detail." `body-md` and `label-sm` provide the technical precision required for event logistics.

**Identity Through Scale:** The relationship between a massive `display-lg` headline and a tiny, tracked-out `label-sm` in `tertiary` (#C6A75E) creates the "Editorial" feel characteristic of high-fashion or architectural journals.

---

### 4. Elevation & Depth
Depth in this system is achieved through "Tonal Layering" rather than traditional structural lines or heavy drop shadows.

- **The Layering Principle:** Instead of shadows, stack containers. Place a `surface_container_highest` element inside a `surface` background to create a "recessed" or "inset" feel.
- **Ambient Shadows:** When a floating effect is required (e.g., a primary action button or a modal), use an **Ambient Shadow**:
- **Opacity:** 8%
- **Blur:** 30px–50px
- **Color:** Derived from the surface content color. This mimics natural light diffusion in a gallery setting.
- **The "Ghost Border" Fallback:** If a boundary is required for accessibility, use a "Ghost Border": the `outline_variant` at **15% opacity**. Never use a 100% opaque border.

---

### 5. Components

#### Buttons
- **Primary:** Moderate rounded corners (`roundedness: 2`), utilizing the 135° Midnight Navy gradient. Text is `on_primary` in `title-sm`.
- **Secondary:** Transparent background with a `surface_container_high` fill. No border.
- **Tertiary:** Text-only in `secondary` (#E8DCC8), utilizing `label-md` with 0.05em letter spacing.

#### Chips
- **Style:** Moderate roundedness consistent with the system standard (level 2).
- **Visuals:** Use `secondary_container` for the background. They should appear structured but soft. Use `on_secondary_container` for text.

#### Minimalist Inputs
- **Structure:** No box enclosure. Only a 1.5px bottom bar using `outline`.
- **State:** On focus, the bottom bar transitions to `tertiary` (#C6A75E). Labels should be `label-sm` and sit 8px above the input line.

#### Cards & Lists
- **Rule:** Absolute prohibition of divider lines.
- **Separation:** Use `surface_container_low` card backgrounds. For lists, use standard vertical whitespace and a subtle background shift on hover to `surface_container`.

#### Event Curation Specials
- **The "Hero" Card:** An asymmetrical card where the image overlaps the container boundary. Use moderate corner radii (level 2) and a Glassmorphism overlay for the event date.
- **The Curator Note:** A text block using `secondary_fixed` background with `body-lg` italicized Inter text.

---

### 6. Do’s and Don’ts

**Do:**
- Use **Intentional Asymmetry**. Align a headline to the left but the subtext to the right to create visual tension.
- Use **Champagne Gold (`tertiary`)** sparingly—only for high-value highlights or active states.
- Embrace **Standard Proportions**. Use the normal spacing scale (level 2) to ensure the interface feels balanced and professional.

**Don’t:**
- **Don’t use 1px borders.** This is the fastest way to break the "Ethereal" aesthetic.
- **Don’t use sharp or pill-shaped corners.** Stick to the moderate `roundedness` (2) scale to maintain a consistent architectural language.
- **Don’t center-align everything.** Center alignment is the default for "templates." For a curated look, use staggered, left-aligned compositions.
- **Don't use pure black.** Always use the designated neutral (#FFFFFF) or primary tones (#1F2A44) for text to maintain the sophisticated tonal range.

---
**Director's Note:** Remember, you are not just building a screen; you are curating an atmosphere. Every element should feel intentional. Use the transitions between `surface` tiers to tell a story of depth and luxury while maintaining a clean, moderate geometric rhythm.