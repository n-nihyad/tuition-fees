# Stylesheet organization

`../index.css` is the only stylesheet entry point. Its imports are deliberately
ordered to preserve the existing cascade. All styles load together, independently
of route loading; no component or application logic is involved.

- `base.css`: Tailwind directives, document defaults and initial card styles.
- `components/`: loading/error states, controls, illustrations and Ant Design integration.
- `layout/`: portal foundation and responsive navigation.
- `theme.css`: the existing rose/sage palette and themed component styles.
- `background.css`: ambient background, texture and background animation.
- `motion.css`: interaction feedback, page transitions and scroll reveal.
- `accessibility.css`: focus, skip link, contrast and status refinements.
- `features/`: dashboard, history toolbar and payment refinements.
- `responsive/`: final history and compact-screen overrides.

Some foundational component styles remain in `layout/portal.css` and `theme.css`.
They intentionally precede the later refinements. This refactor moves existing
rules without changing selectors, declarations, media queries or their order.
Do not consolidate duplicate selectors or reorder imports as routine cleanup:
later declarations can depend on earlier ones, including reduced-motion rules.

Prefer editing an existing rule in the relevant file. Changes to the cascade or
theme should be treated as a separate visual change and checked at mobile,
tablet and desktop sizes.
