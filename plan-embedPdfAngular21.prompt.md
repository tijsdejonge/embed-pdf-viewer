## Plan: Modernize Angular EmbedPDF integration (targeting v2.0.0)

This plan updates the Angular adapter to **EmbedPDF v2.0.0’s multi-document architecture** while keeping a clean Angular 21 developer experience (signals-first, `input()`, `inject()`, component-scoped providers, OnPush, and deterministic cleanup).

In v2, “which document?” becomes a first-class concern across core + plugins. The Angular integration should embrace that explicitly:

- `<embed-pdf>` still owns a single `PluginRegistry` lifecycle (create/register/initialize/destroy).
- The Angular API must make `documentId` and `activeDocumentId` easy to work with.
- Services should provide **document-scoped facades** (e.g., `forDocument(id)`), with ergonomic defaults (e.g., “active document”).

### Steps (v2-first execution order)

1. **Fork/upgrade to the v2.0.0 branch** and align package versions/exports so the Angular work is done against v2 contracts.
2. Refactor `<embed-pdf>` to **v2-ready lifecycle** and provide a richer `PDF_CONTEXT` that supports multi-document usage.
3. Rebuild Angular services around **document-scoped access** (`forDocument(documentId)`), removing any remaining manual instantiation (`new ...`) and ensuring provider scope correctness.
4. Modernize the public Angular API to Angular 21 style (signal inputs via `input()`, typed context, optional “active document” helpers).
5. Upgrade auto-mount to be **document-aware** and use a consistent dynamic rendering strategy (prefer programmatic creation with correct injector scoping).
6. Align `@embedpdf/engines` Angular integration with v2’s multi-document expectations (including cleanup/memory behavior), and add minimal multi-doc test coverage.

### Further Considerations (v2-specific)

1. Who “owns” the active document in Angular?
   - Option A: Angular wrapper exposes a `setActiveDocumentId(...)` helper and reads `registry.getActiveDocumentId*()`.
   - Option B: user code owns it; Angular only reflects it.
2. Should Angular components default to **active document** when `documentId` isn’t provided (ergonomic) or require explicit `documentId` (safer)?
3. Auto-mount semantics in multi-doc:
   - “utilities” are global vs per-document?
   - wrappers wrap the viewer root vs a per-document subtree?
4. SSR: v2 doesn’t change the fact that engines and many plugins are DOM-dependent. Decide whether `<embed-pdf>` must be client-only and how to defer init.

---

### What each step concretely changes (so it’s actionable)

**1) Upgrade/fork from v2.0.0**

- Base all Angular API decisions on v2 contracts:
  - multi-document state (`documents: Record<string, ...>` + `activeDocumentId`),
  - document-aware actions/events,
  - plugin document lifecycle hooks,
  - `forDocument(documentId)` patterns exposed by plugins.

Acceptance criteria:

- The workspace builds against v2 types (even before Angular refinements), so refactors aren’t fighting stale types.

**2) v2-ready lifecycle for `<embed-pdf>`**

Goal: keep a single registry lifecycle, but expose enough multi-doc affordances for the rest of Angular.

- Treat `engine` + `plugins` as **identity inputs** (recreate registry when they change).
- Maintain destroy-safety (stale async init must not win).
- Extend Angular context to support v2:
  - `registry` (signal)
  - `isInitializing` (signal)
  - `pluginsReady` (signal)
  - `activeDocumentId` (signal or computed from registry)
  - optional helpers: `getActiveDocumentIdOrNull()` and `getCoreDocumentOrThrow(documentId)` should be used behind services, not in templates.

Acceptance criteria:

- Recreating the registry does not leak views or subscriptions.
- Multi-document apps can render without forcing a single document model.

**3) Document-scoped Angular services (the v2 “correctness layer”)**

In v2, most plugin APIs are effectively two-tier:

- registry-level (global)
- per-document (via `forDocument(documentId)` / document-aware actions)

Angular should mirror that with small, typed facades:

- `RegistryService`: owns access to the current `PluginRegistry` from `PDF_CONTEXT`.
- `PluginService`: registry-wide plugin access.
- `DocumentScopeService` (new): resolves a `documentId` (explicit or active) and returns typed per-document scopes:
  - `forDocument(documentId)` wrappers
  - helpers for “active document fallback”

Key DI rule:

- Provide registry-aware services in the same **ElementInjector scope** as `<embed-pdf>` (component `providers`) so multiple viewers on the same page don’t share state.
  - This aligns with Angular’s ElementInjector isolation model (see https://angular.dev/guide/di/hierarchical-dependency-injection#elementinjector).

Acceptance criteria:

- Two `<embed-pdf>` instances do not cross-talk.
- All subscriptions/effects are cleaned up on destroy.

**4) Angular 21 public API modernization (v2-flavored)**

- Replace `@Input()` with `input()` for all public components.
  - `input.required<T>()` for required identity inputs.
  - Docs: https://angular.dev/api/core/input
- Add optional `documentId` inputs on any Angular components that wrap **document-scoped plugin components** (render layers, scrollers, selection/annotation layers, etc.).
- Prefer signal-first exports:
  - provide `Signal`/`computed` accessors in services
  - optionally keep observable adapters for backwards compatibility (library ergonomics)

Acceptance criteria:

- Consumers can build either:
  - “single-doc simple” usage (no `documentId` provided, active doc is used), or
  - “multi-doc explicit” usage (pass `documentId` everywhere it matters).

**5) Auto-mount rendering improvements (v2-aware)**

In v2, auto-mounted UI often needs the right viewer-scoped injector _and_ may need to respond to document changes.

- Prefer **programmatic creation** so you control injector scoping and host placement.
  - In-tree: `ViewContainerRef.createComponent(...)` (best when the mounted UI should be part of the Angular tree).
    - API: https://angular.dev/api/core/ViewContainerRef#createComponent
  - Out-of-tree / mount into a specific DOM node: `createComponent(..., { hostElement, environmentInjector })` + `ApplicationRef.attachView(...)`.
    - API: https://angular.dev/api/core/createComponent
- Use `bindings` and helpers to wire inputs/outputs at creation time:
  - `inputBinding`, `outputBinding`, `twoWayBinding`
  - Guide section: https://angular.dev/guide/components/programmatic-rendering#binding-inputs-outputs-and-setting-host-directives-at-creation

Document-aware behavior to implement:

- If wrappers/utilities are effectively per-document, mount them keyed by `documentId` and tear down on document close.
- If they’re global, mount once per registry.

Note:

- If you keep template-driven dynamic rendering, `NgComponentOutlet` supports passing both an `Injector` and `EnvironmentInjector` (`ngComponentOutletInjector`, `ngComponentOutletEnvironmentInjector`), but you lose some control over host placement and lifecycle ergonomics.
  - API: https://angular.dev/api/common/NgComponentOutlet

Acceptance criteria:

- No mixing new control flow (`@for`) with legacy structural directives in a way that complicates injector scoping.
- Auto-mounted components always see the correct `PDF_CONTEXT`.

**6) Engines Angular alignment + multi-doc regression coverage**

- Ensure the Angular engine provider story composes with multi-document:
  - engine init remains viewer-scoped
  - cleanup paths are deterministic
  - memory-sensitive flows (open/close multiple docs) do not leak resources

Add minimal tests (or an example harness) that:

- opens two documents (two `documentId`s),
- switches `activeDocumentId`,
- closes a document,
- verifies per-document state is isolated and resources are freed.

---

### Suggested shape of the v2 Angular API (high-level)

- `PDF_CONTEXT` should expose signals (or a typed façade) rather than a mutable object with `as any`.
- Services should offer both:
  - `active` document helpers (ergonomic)
  - `forDocument(documentId)` helpers (explicit multi-doc)

This keeps Angular usage pleasant for “one viewer, one doc” while still being correct and scalable for v2’s multi-document model.
