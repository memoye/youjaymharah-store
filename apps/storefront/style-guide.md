# YouJaymharah Trends — Storefront Style Guide

> **Design direction:** Editorial luxury, warm minimalism, restrained fashion-house aesthetic.
>
> **Core principle:** **Bodoni creates emotion. Montserrat communicates information.**

---

## 1. Brand Direction

YouJaymharah Trends should feel:

- Editorial
- Luxurious
- Warm
- Confident
- Modern
- Restrained
- Feminine without being overly decorative

The storefront can take structural inspiration from high-end fashion ecommerce, but it must **not feel like a generic luxury Shopify theme**.

### Avoid

- Excessive gold
- Gold buttons everywhere
- Heavy borders
- Excessive rounded cards
- Large all-caps headlines
- Eyebrow + headline + description as a default hero formula
- Decorative serif text throughout the UI
- Overly dense navigation
- Excessive animation
- Generic “luxury fashion” clichés
- Purple/neon or highly saturated accents
- Red sale styling

### Prefer

- Large editorial imagery
- Generous whitespace
- Strong typography hierarchy
- Quiet interaction states
- Warm neutrals
- Hairline borders
- Sentence case
- Minimal chrome
- Clear product information
- Intentional asymmetry where appropriate

---

# 2. Brand Colors

## Core palette

| Token | Value | Usage |
|---|---|---|
| `black` / `ink` | `#0A0A0A` | Primary text, primary surfaces, strong actions |
| `gold` | `#C9A227` | Accent, selected states, decorative details |
| `gold-light` | `#E5C76B` | Champagne accent on dark surfaces |
| `ivory` | `#F7F1E7` | Warm surfaces, secondary sections |
| `white` | `#FFFFFF` | Clean surfaces, breathing room |

### Existing semantic tokens

```text
--background
--foreground
--primary
--primary-foreground
--secondary
--secondary-foreground
--muted
--muted-foreground
--accent
--accent-foreground
--border
--input
--ring
--destructive
```

### Brand-specific tokens

```text
--gold
--gold-light
--gold-foreground
--gold-hairline
--ink
--ink-foreground
--sale
```

## Usage rules

### Black / Ink

Use for:

- Primary text
- Main navigation
- Primary buttons
- Strong footer surfaces
- Hero overlays where needed

### Gold

Use sparingly for:

- Accent rules
- Selected/focused states
- Small decorative details
- Important brand moments
- Occasional icons or indicators

**Do not use gold as the default primary button color.**

### Gold-light / Champagne

Use primarily:

- On dark backgrounds
- In inverted/black sections
- As a subtle highlight

### Ivory

Use for:

- Editorial sections
- Secondary surfaces
- Warm backgrounds
- Newsletter or brand-story sections

### Sale

Use only where semantic sale status is required.

Do not turn the entire sale interface red. A restrained muted treatment is preferred.

---

# 3. Typography

## Font families

### Bodoni Moda

Use for:

- Hero headlines
- Major editorial headings
- Large campaign statements
- Selective brand/editorial moments

Bodoni is **not** the general UI font.

### Montserrat

Use for:

- Navigation
- Product names
- Prices
- Body copy
- Buttons
- Forms
- Filters
- Breadcrumbs
- Labels
- Metadata
- General UI

## Core principle

> **Bodoni above 32px. Montserrat below 32px.**

Do not use Bodoni for small labels, product metadata, buttons, or dense UI.

---

# 4. Typography Scale

| Role | Font | Size | Weight | Tracking | Notes |
|---|---|---:|---:|---:|---|
| `text-display-xl` | Bodoni | `clamp(3rem, 7vw, 6rem)` | 400 | `-0.015em` | Hero only |
| `text-display-lg` | Bodoni | `clamp(2.5rem, 5vw, 4.5rem)` | 400 | `-0.01em` | Major editorial |
| `text-display-md` | Bodoni | `2.5rem` | 400 | 0 | Smaller editorial heading |
| `text-intro` | Montserrat | `1.25rem` | 400 | 0 | Standfirst / intro |
| Heading | Montserrat | `24px` | 500 | `-0.01em` | Standard section heading |
| Body | Montserrat | `16px` | 400 | 0 | Default body |
| Product name | Montserrat | `15px` | 400 | 0 | Sentence case |
| Option label | Montserrat | `13px` | 500 | 0 | Colour, size, etc. |
| Price | Montserrat | `13px` | 400 | 0 | Use `tabular-nums` |
| Breadcrumb | Montserrat | `12px` | 400 | 0 | Muted |
| Form label | Montserrat | `13px` | 500 | 0 | Sentence case |
| Navigation | Montserrat | `13px` | 500 | `0.02em` | Desktop nav |
| Button | Montserrat | `12–13px` | 500 | `0.06em` | Uppercase action |

### Body copy

Use **16px** as the default body size.

For short editorial copy:

```text
font-size: 20px
line-height: 1.6
```

Keep body/intro line length around **65–70 characters** where possible.

---

# 5. Tailwind v4 Typography Setup

## Font variables

Use `next/font` and expose:

```text
--font-montserrat
--font-bodoni
```

Then map them through `@theme inline`.

Recommended:

```css
@theme inline {
  --font-sans: var(--font-montserrat), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-bodoni), Didot, "Bodoni MT", Georgia, serif;
}
```

Use:

```text
font-sans
font-display
```

Do not use `font-serif` for Bodoni unless there is a specific reason.

## Typography tokens

Prefer Tailwind v4 `--text-*` theme variables rather than a separate utility system.

```css
@theme inline {
  --text-display-xl: clamp(3rem, 7vw, 6rem);
  --text-display-xl--line-height: 0.95;
  --text-display-xl--letter-spacing: -0.015em;
  --text-display-xl--font-weight: 400;

  --text-display-lg: clamp(2.5rem, 5vw, 4.5rem);
  --text-display-lg--line-height: 0.98;
  --text-display-lg--letter-spacing: -0.01em;
  --text-display-lg--font-weight: 400;

  --text-display-md: 2.5rem;
  --text-display-md--line-height: 1;
  --text-display-md--font-weight: 400;

  --text-intro: 1.25rem;
  --text-intro--line-height: 1.6;
  --text-intro--font-weight: 400;
}
```

Usage:

```tsx
<h1 className="font-display text-display-xl">
  Designed to be remembered.
</h1>
```

```tsx
<p className="text-intro">
  A considered collection of pieces designed for the moments that matter.
</p>
```

---

# 6. `cn` / Tailwind Merge

The project uses the shadcn `cn` package.

Use `createCn` so custom `text-*` typography tokens participate correctly in Tailwind class conflict resolution.

```ts
import { createCn } from "cn/config"

export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display-xl",
            "display-lg",
            "display-md",
            "intro",
          ],
        },
      ],
    },
  },
})
```

These:

```text
text-display-xl
text-display-lg
text-display-md
text-intro
```

are all font-size utilities and should conflict with one another just like:

```text
text-2xl
text-3xl
text-4xl
```

Do **not** add `conflictingClassGroups` for these. `classGroups` is the correct extension because they belong to the existing `font-size` group.

---

# 7. Text Case Rules

## Default

Use sentence case.

```text
New arrivals
The YJ Edit
Designed to be remembered.
```

Avoid:

```text
NEW ARRIVALS
THE YJ EDIT
DESIGNED TO BE REMEMBERED
```

### Uppercase is reserved primarily for actions

Good:

```text
SHOP NEW ARRIVALS
VIEW COLLECTION
ADD TO BAG
```

Navigation should normally stay in sentence case:

```text
Women
New arrivals
Collections
```

Do not combine tiny text + heavy semibold + aggressive tracking across multiple UI levels.

---

# 8. Header

## Desktop

Prefer a **single-row header**.

Concept:

```text
[YJ]   Women   New arrivals   Collections           Search   ♡   Bag
```

### Header principles

- Minimal height
- Generous horizontal spacing
- No oversized centered logo row
- No unnecessary second navigation row
- YJ mark preferred over repeating the full wordmark
- Navigation is Montserrat
- Header should not visually compete with the hero

## Mobile

Concept:

```text
☰        YJ                    ♡   Bag
```

Keep the mobile header extremely simple.

---

# 9. Hero

The hero is the strongest visual element on the homepage.

## Structure

```text
Hero media
    ↓
Headline
Description
CTA
```

Do **not** automatically use an eyebrow.

Avoid:

```text
NEW SEASON
Designed to be remembered.
...
```

Prefer:

```text
Designed to be remembered.

A considered collection of pieces
designed for the moments that matter.

SHOP NEW ARRIVALS
```

## Hero typography

Headline:

```text
font-display
text-display-xl
```

Description:

```text
text-intro
```

CTA:

```text
font-sans
text-xs / text-[13px]
font-medium
tracking-[0.06em]
uppercase
```

## Hero media

Support:

- Desktop image
- Mobile image
- Desktop video
- Optional portrait/mobile video
- Image poster for video
- Reduced-motion fallback

Mobile video selection:

```text
portrait video
    ↓ if unavailable
desktop video / poster
```

Respect `prefers-reduced-motion`.

---

# 10. Homepage Structure

Recommended order:

```text
1. Announcement bar
2. Header
3. Hero
4. New Arrivals
5. Featured Collection
6. Shop Women
7. Brand Statement
8. Newsletter
9. Footer
```

Do not force every backend capability onto the homepage.

The homepage is an editorial entry point, not an admin feature showcase.

---

# 11. Product Cards

Product cards should be quiet and information-first.

## Structure

```text
┌─────────────────────────────┐
│                             │
│          IMAGE              │
│                             │
│                           ♡ │
└─────────────────────────────┘

Neat Leather Bag
₦45,000
```

### Product name

```text
15px
Montserrat
400
sentence case
```

### Price

```text
13px
Montserrat
400
tabular-nums
```

### Sale

```text
Original price → muted + line-through
Sale price     → foreground
```

Do not use bright red as the primary sale treatment.

### Wishlist

Use a simple icon overlay.

Avoid:

- Large pill buttons
- Text-heavy image overlays
- Huge badges
- Permanent “NEW” ribbons

---

# 12. Images

Fashion photography should carry most of the visual personality.

Prefer:

- Full-bleed imagery
- Consistent image ratios
- Editorial crops
- High-quality product photography
- Generous image spacing

Avoid excessive card chrome.

The image should feel like part of the editorial layout, not trapped inside a generic ecommerce card.

---

# 13. Buttons

Buttons are functional, not decorative.

## Primary

```text
Background: ink
Text: ivory / white
Font: Montserrat
Size: 12–13px
Weight: 500
Tracking: 0.06em
Case: uppercase
```

Example:

```text
SHOP NEW ARRIVALS
```

## Secondary

Prefer understated:

```text
border border-border
background transparent
```

or an underline/text action.

## Gold buttons

Use selectively.

Gold is an accent, not the default action color.

---

# 14. Borders and Radius

The brand is intentionally sharp and editorial.

Current base:

```css
--radius: 0rem;
```

Keep that unless a component genuinely benefits from rounding.

### Borders

Use warm hairlines rather than cool grey:

```text
border-border
```

or the explicit:

```text
border-gold-hairline
```

only where appropriate.

Avoid:

- Thick borders
- Heavy cards
- Large rounded containers
- Excessive outlines

---

# 15. Spacing & Layout

Prioritize whitespace over decorative separators.

### General principles

- Large vertical spacing between editorial sections
- Consistent page gutters
- Product grids should breathe
- Text blocks should not span the entire viewport
- Let imagery create rhythm

### Content width

For readable copy:

```text
~65–70 characters
```

For general content:

Use a centered max-width appropriate to the page rather than letting content touch viewport edges.

### Responsive behavior

Design mobile intentionally.

Do not simply stack desktop elements and call it responsive.

Especially review:

- Hero crop
- Hero typography
- Product image ratios
- Navigation
- Editorial composition
- CTA position
- Text line lengths

---

# 16. Section Headings

Most homepage section headings can be Montserrat.

Example:

```text
New Arrivals
```

Use Bodoni when the section is deliberately editorial:

```text
The YJ Edit
```

Do not make every heading a giant serif statement.

### Rule

> The hero is the only place Bodoni is guaranteed above the fold.

Everything else can remain Montserrat unless the visual composition has a clear editorial reason to use Bodoni.

---

# 17. Brand Statement

Keep the copy short and confident.

Preferred treatment:

- Ivory or black section
- Large whitespace
- Optional Bodoni heading
- Montserrat body / intro
- No excessive decoration

Concept:

```text
The YJ Edit

We believe clothing should feel as
distinctive as the woman wearing it.
```

---

# 18. Newsletter

Keep it editorial rather than promotional.

Example direction:

```text
The YJ Edit

New collections, considered pieces and
invitations to discover what's next.
```

Form:

- One clean input
- Clear label
- Quiet button
- Strong focus state
- No excessive card styling

---

# 19. Navigation & Menus

Desktop main navigation:

```text
Women
New arrivals
Collections
```

Potential future structure:

```text
Women
Men
Accessories
Beauty
```

Use a mega menu only when the catalogue justifies it.

### Mega menu principles

- Clear grouping
- Plenty of whitespace
- Simple category labels
- No enormous typography
- No image carousel inside the menu unless intentionally designed

Example:

```text
CLOTHING                 THE EDIT

Dresses                  New arrivals
Tops                     Best sellers
Bottoms                  Occasion edit
Sets
Outerwear
```

---

# 20. Forms

Forms should feel like part of the fashion site, not a SaaS dashboard.

### Labels

```text
13px
Montserrat
500
sentence case
```

### Input

- Clean
- Minimal radius
- Warm border
- Strong focus ring
- Comfortable height
- No unnecessary shadows

### Error

Use semantic `--destructive`, but keep the visual treatment restrained.

---

# 21. Accessibility

Luxury does not mean low contrast or tiny UI.

### Minimum rules

- Body text must remain readable
- Interactive controls need visible focus states
- Do not use gold text on white for ordinary content
- Gold is an accent, not a body-text color on light backgrounds
- Do not rely on colour alone for sale, errors, selection, etc.
- Respect reduced motion
- Maintain adequate touch targets on mobile

### Important palette note

The brand gold is not suitable for ordinary body text on white.

Use dark ink for readable text.

Gold is primarily an accent on light backgrounds and a readable highlight on dark backgrounds.

---

# 22. Dark / Inverted Sections

`.dark` is being used as a **local inverted theme**, not as a user theme toggle.

Example:

```tsx
<section className="dark bg-background text-foreground">
```

This allows shadcn components inside the section to use the inverted semantic tokens.

Good candidates:

- Footer
- Hero overlays
- Black editorial sections
- Certain promotional moments

Do not make the entire site permanently dark.

---

# 23. Motion

Animation should feel expensive because it is restrained.

Prefer:

- Gentle fades
- Small opacity transitions
- Subtle image movement
- Underline transitions
- Menu reveal transitions

Avoid:

- Bouncy animation
- Excessive spring effects
- Large parallax
- Constant hover movement
- Attention-seeking page transitions

Always respect:

```css
@media (prefers-reduced-motion: reduce)
```

---

# 24. Component Class Philosophy

Prefer normal Tailwind utilities for one-off styles.

Good:

```tsx
<p className="text-[15px] leading-6 font-normal">
  Neat Leather Bag
</p>
```

Do not create a custom utility for every possible combination.

Create named design tokens only where the concept is genuinely reusable.

Good custom typography tokens:

```text
text-display-xl
text-display-lg
text-display-md
text-intro
```

Avoid building:

```text
type-product
type-price
type-label
type-breadcrumb
type-card
type-meta
type-small
type-caption
...
```

The latter becomes a second styling framework inside Tailwind.

---

# 25. `cn` Usage

Use `cn` when composing or overriding classes.

Good:

```tsx
className={cn(
  "font-display text-display-xl",
  className,
)}
```

Not necessary:

```tsx
className={cn("text-display-xl")}
```

Static class strings can simply be written directly.

Custom text-size classes are registered in `createCn`:

```ts
import { createCn } from "cn/config"

export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display-xl",
            "display-lg",
            "display-md",
            "intro",
          ],
        },
      ],
    },
  },
})
```

Do not add `conflictingClassGroups` for these typography classes.

---

# 26. Homepage Reference

A strong homepage composition is:

```text
┌──────────────────────────────────────────────┐
│ HEADER                                       │
├──────────────────────────────────────────────┤
│                                              │
│                  HERO                        │
│                                              │
│           Designed to be                     │
│              remembered.                     │
│                                              │
│      A considered collection...              │
│                                              │
│          SHOP NEW ARRIVALS                   │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│              New Arrivals                    │
│                                              │
│    [product] [product] [product] [product]  │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│             THE YJ EDIT                      │
│                                              │
│         editorial collection                 │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│              Shop Women                      │
│                                              │
│      [Dresses] [Tops] [Bottoms]              │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│              Brand statement                 │
│                                              │
├──────────────────────────────────────────────┤
│                                              │
│              The YJ Edit                     │
│             newsletter                       │
│                                              │
├──────────────────────────────────────────────┤
│                 FOOTER                       │
└──────────────────────────────────────────────┘
```

---

# 27. Quick Decision Rules

### “Should this be Bodoni?”

Only if it is:

- Editorial
- Emotional
- Large
- Visually important

Otherwise use Montserrat.

### “Should this be uppercase?”

Usually only if it is:

- A button
- A very deliberate micro-label

Do not default all navigation and headings to uppercase.

### “Should this be gold?”

Only if it needs to be an accent.

Do not use gold just because it is in the brand palette.

### “Does this need a custom utility?”

Only if the pattern is:

- Repeated
- Semantically meaningful
- Part of the design system

Otherwise use Tailwind utilities directly.

### “Does this need animation?”

Only when it improves:

- Orientation
- Feedback
- Navigation
- Visual polish

Never animate just because you can.

### “Does this component need a card?”

Not by default.

Editorial fashion layouts often work better without visible cards.

---

# 28. Core Design Principle

> **Restraint is part of the brand.**

The website should not constantly announce that it is luxurious.

The combination of:

- photography
- whitespace
- Bodoni at large sizes
- Montserrat for information
- warm neutrals
- restrained interaction
- precise spacing

should create the luxury feeling naturally.
