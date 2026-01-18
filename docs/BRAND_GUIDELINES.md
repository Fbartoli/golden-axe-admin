# Horusblock Brand Guidelines

A dark-first, minimal design inspired by Stripe, Linear, and Vercel.

## Color Palette

| Color | Hex | CSS Variable | Usage |
|-------|-----|--------------|-------|
| Black | `#0D0D0D` | `--background` | Primary background |
| Dark | `#141414` | `--card` | Cards, elevated surfaces |
| Muted | `#1A1A1A` | `--muted` | Borders, subtle elements |
| Gold | `#D4AC0D` | `--primary` | Accents, CTAs, links |
| Gold Light | `#F4D03F` | - | Hover states |
| Gold Dark | `#B7950B` | - | Pressed states |
| White | `#FFFFFF` | `--foreground` | Primary text |
| Gray | `#888888` | `--muted-foreground` | Secondary text |

## Status Colors

| Status | Color | Hex |
|--------|-------|-----|
| Success | Green | `#22c55e` |
| Warning | Yellow | `#eab308` |
| Error | Red | `#ef4444` |
| Info | Blue | `#3b82f6` |

## Typography

- **Sans-serif**: Inter, SF Pro, system-ui
- **Monospace**: JetBrains Mono, Menlo, Monaco

### Font Sizes

| Size | Class | Usage |
|------|-------|-------|
| xs | `text-xs` | Labels, badges, metadata |
| sm | `text-sm` | Secondary text, descriptions |
| base | `text-base` | Body text |
| lg | `text-lg` | Subheadings |
| xl | `text-xl` | Section titles |
| 2xl | `text-2xl` | Page titles |

## Spacing

Use Tailwind's spacing scale:
- `gap-2` (8px) - Tight spacing
- `gap-3` (12px) - Default spacing
- `gap-4` (16px) - Comfortable spacing
- `gap-6` (24px) - Section spacing

## Border Radius

| Size | Class | Usage |
|------|-------|-------|
| sm | `rounded-sm` | Badges, small elements |
| md | `rounded-md` | Buttons, inputs |
| lg | `rounded-lg` | Cards, panels |

## Components

### Buttons

```tsx
// Primary action (gold)
<Button variant="gold">Save Changes</Button>

// Secondary action
<Button variant="secondary">Cancel</Button>

// Destructive action
<Button variant="danger">Delete</Button>

// Success action
<Button variant="success">Enable</Button>
```

### Badges

```tsx
// Status badges
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Failed</Badge>
<Badge variant="info">Processing</Badge>

// Brand badge
<Badge variant="gold">Premium</Badge>
```

### Cards

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description text</CardDescription>
  </CardHeader>
  <CardContent>
    Content goes here
  </CardContent>
</Card>
```

## Dark Mode

Dark mode is the default. Light mode is available via the `light` class on `<html>`.

```tsx
// Toggle dark mode
document.documentElement.classList.toggle('light', !darkMode)
```

## CSS Variables

All colors are defined as CSS variables in `app/globals.css`:

```css
:root {
  --background: 0 0% 5%;      /* #0D0D0D */
  --foreground: 0 0% 100%;    /* #FFFFFF */
  --card: 0 0% 8%;            /* #141414 */
  --muted: 0 0% 10%;          /* #1A1A1A */
  --primary: 47 89% 44%;      /* Gold #D4AC0D */
  --border: 0 0% 15%;
}
```

## Icons

Use [Lucide React](https://lucide.dev/) icons:

```tsx
import { Settings, Users, Database } from 'lucide-react'

<Settings className="h-4 w-4" />
```

Standard icon sizes:
- `h-3 w-3` - Badge icons
- `h-4 w-4` - Button icons
- `h-5 w-5` - Card title icons
- `h-6 w-6` - Large icons

## Accessibility

- All interactive elements must have visible focus states
- Use semantic HTML elements
- Provide ARIA labels where necessary
- Ensure sufficient color contrast (4.5:1 for normal text)
