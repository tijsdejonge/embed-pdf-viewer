## Plan: Modernize Angular EmbedPDF integration

Bring the Angular packages in line with Angular 21 idioms (signals, `input()`, `inject()`, scoped DI, standalone defaults) while preserving EmbedPDF’s core contract: a single root `<EmbedPDF>` provider creates a `PluginRegistry`, registers one `plugins` array, awaits `initialize()` + `pluginsReady()`, auto-mounts plugin DOM elements, and tears down safely on destroy / input changes.

### Steps

1. Refactor `<embed-pdf>` to “React-parity lifecycle” in [packages/core/src/angular/components/embed-pdf.component.ts](packages/core/src/angular/components/embed-pdf.component.ts) (`EmbedPdfComponent`).
2. Fix Angular DI scoping + remove manual `new` in [packages/core/src/angular/services](packages/core/src/angular/services) (`RegistryService`, `PluginService`, `CapabilityService`, `CoreStateService`, `StoreStateService`).
3. Modernize public Angular API to Angular 21 style in [packages/core/src/angular](packages/core/src/angular) (replace `@Input` with `input()`, remove `standalone: true`, tighten `PDFContextState` typing).
4. Improve auto-mount rendering strategy in [packages/core/src/angular/components/auto-mount.component.ts](packages/core/src/angular/components/auto-mount.component.ts) (`AutoMountComponent`) to avoid mixing `@for` + `*ngComponentOutlet`, and to enable correct injector scoping for mounted utilities/wrappers.
5. Align `@embedpdf/engines` Angular integration with the same modern patterns in [packages/engines/src/angular](packages/engines/src/angular) (`PdfEngineService`, `PdfEngineProviderComponent`) so it composes cleanly with `<embed-pdf>`.

### Further Considerations

1. Should `<embed-pdf>` support live updates to `plugins`/`engine`, or document them as “identity inputs” (recreate-only)?
2. Do you want Angular to expose “hooks-like” helpers (signals-based) or keep class-based services as the primary access pattern?
3. Is SSR a goal? If yes, decide whether engine init must be client-only and how to guard DOM auto-mount.

---

### What each step concretely changes (so it’s actionable)

**1) React-parity lifecycle for `<embed-pdf>`**

- In `EmbedPdfComponent`, treat `engine` + `plugins` as _reactive identity inputs_:
  - when either changes: destroy old registry, create new `PluginRegistry`, `registerPluginBatch()`, `initialize()`, then `pluginsReady()`.
- Add destroy-safety guards mirroring React/Svelte behavior:
  - don’t set `pluginsReady` after component destroy or after registry is destroyed.
- Keep the EmbedPDF contract intact: `pluginsReady` gates auto-mount (same as React `AutoMount` and core `PluginRegistry.pluginsReady()` semantics).

**2) Correct DI + scoping (biggest Angular correctness fix)**

- Remove `new RegistryService()` / `new PluginService()` patterns.
- Provide registry-aware services in the same injector scope as `<embed-pdf>` so they always read the right `PDF_CONTEXT`:
  - `RegistryService` should `inject(PDF_CONTEXT, { optional: true })` and be provided at the component level (or in a dedicated provider component).
  - `PluginService`, `CapabilityService`, `CoreStateService`, `StoreStateService` should use `inject(RegistryService)` rather than instantiating it.
- Ensure subscription cleanup uses Angular primitives (e.g., `DestroyRef`) instead of relying on class destructors that may never run if the service is incorrectly scoped.

**3) Angular 21 API modernization**

- Replace `@Input()` with `input()` for:
  - `EmbedPdfComponent` (`engine`, `plugins`, `logger`, `autoMountDomElements`, `onInitialized`)
  - `AutoMountComponent` (`plugins`)
  - `NestedWrapperComponent` (`wrappers`)
- Remove explicit `standalone: true` from decorators (standalone is default now).
- Tighten `PDFContextState` in [packages/core/src/angular/context.ts](packages/core/src/angular/context.ts):
  - avoid the current “getter + `as any`” pattern; instead expose a stable context that’s either signals or plain values, but typed.
  - Recommendation: expose signals in context (or a typed façade), because the Angular code is already signal-first.

**4) Auto-mount rendering improvements**

- Today `AutoMountComponent` uses `@for` plus `*ngComponentOutlet`, which mixes new control flow with legacy structural directives.
- Prefer one of these consistent approaches:
  - **Option A (recommended): programmatic creation** using `ViewContainerRef.createComponent` and/or `createComponent` so you can:
    - pass the right injector scope for each mount (critical for `PDF_CONTEXT`),
    - explicitly control attachment point (`hostElement`) when the mount point comes from EmbedPDF,
    - manage lifetimes deterministically.
  - **Option B: keep templates only**, but switch to a purely template-driven strategy (accepting limitations around injector control and wrapper nesting).
- Preserve EmbedPDF intent: wrappers wrap the subtree in a deterministic order; utilities mount independently after readiness.

**4a) Concrete Angular 21 strategy for AutoMount (createComponent / ViewContainerRef)**

Angular provides two good primitives here:

- **`ViewContainerRef.createComponent(...)`**: creates a component and automatically inserts it into the current view hierarchy. Use this when the mounted UI should be part of the Angular tree at the AutoMount location.
- **Standalone `createComponent(...)` with `hostElement`**: creates a `ComponentRef` and lets you mount it wherever you want (including onto an existing DOM element coming from EmbedPDF). Use this when the mount point is not naturally an Angular “in-tree” node or when you need to mount into a specific element returned by `PluginRegistry`.

Key details to incorporate into the implementation (pulled from Angular v21 docs):

- Both APIs support a `bindings` array so you can declaratively wire inputs/outputs at creation time via `inputBinding`, `outputBinding`, `twoWayBinding`.
- Both APIs support a `directives` array to apply host directives.
- When using standalone `createComponent`, you must usually:
  - provide `environmentInjector`,
  - `ApplicationRef.attachView(ref.hostView)` so it participates in change detection,
  - and on cleanup `ApplicationRef.detachView(ref.hostView)` + `ref.destroy()`.

Implementation notes for EmbedPDF’s AutoMount semantics:

- **Wrappers (nesting)**: treat wrappers as a deterministic stack. Programmatically create them either:

  - in-tree (via `ViewContainerRef.createComponent`) into a single “anchor” container and pass down the next anchor (DOM element or token) to the next wrapper, or
  - out-of-tree by creating a host element per wrapper and wiring it to the exact DOM element EmbedPDF expects.

- **Utilities (independent mounts)**: for each `autoMountElement`, mount a component into the exact element provided by the registry (best fit for standalone `createComponent` + `hostElement`), or into a known “utilities outlet” container (best fit for `ViewContainerRef.createComponent`).

- **Cleanup**: whenever `plugins`/`engine` changes or the component is destroyed, ensure we:
  - destroy all mounted component refs,
  - remove any host elements we created,
  - and (for standalone `createComponent`) detach views from `ApplicationRef` before destroy.

Docs references (Angular v21):

- `createComponent`: https://angular.dev/api/core/createComponent
- Programmatic rendering guide (includes in-tree vs out-of-tree + bindings examples): https://angular.dev/guide/components/programmatic-rendering
- `ViewContainerRef.createComponent`: https://angular.dev/api/core/ViewContainerRef#createComponent
- Binding helpers: https://angular.dev/api/core/inputBinding , https://angular.dev/api/core/outputBinding , https://angular.dev/api/core/twoWayBinding

**5) Engines Angular alignment**

- `PdfEngineProviderComponent` / `PdfEngineService` currently read more “Angular <=16 RxJS-era”.
- Modernize by:
  - making `PdfEngineProviderComponent` standalone + OnPush
  - switching `PdfEngineService` state to signals (or at least providing signal facades) so `<embed-pdf>` users can stay in signal-land
  - removing unused subscription plumbing in the provider component (it currently tracks `subscription` but never assigns it)
- Keep public API stable (engine$, isLoading$, error$ can remain if you want backward compatibility), but prefer signals for new examples.

If you want, I can refine this plan into an “execution order” that minimizes breaking changes (e.g., first fix DI scoping + reinit semantics without changing public APIs, then do `input()` migration, then improve auto-mount rendering).
