# ghost-poster — Generation Prompts

This file documents the prompts used to generate the application code with Claude Code. It is part of the project's commitment to transparency about how it was built.

---

## Context

The app was generated across several Claude Code (Anthropic) sessions, guided by prompts written upfront in Claude claude.ai. Each prompt went through multiple design iterations before being submitted to Claude Code.

The process was not linear: some files were regenerated after review, some architectural decisions were revised between sessions. This document reflects the final version of the prompts that produced the delivered code.

---

## Main prompt — initial project generation

The prompt below was submitted to Claude Code at the start of the main session. It specifies the architecture, stack, security constraints, functional specifications for each screen, code conventions, and the file generation order.

It was written after an upfront design phase covering:
- `jose` vs `jsonwebtoken` (Hermes engine compatibility)
- HTML↔Markdown editing strategy (turndown + marked vs native Lexical vs HTML round-trip)
- Multi-instance model (named instances with uuid vs indexed url/key pairs)
- Image upload strategy (gallery only vs document picker, end-of-content insertion vs cursor position)
- Security by design (SecureStore, ephemeral JWT, Ghost optimistic lock)

---

### Prompt v1 — initial scaffold

> *Initial version — superseded before Claude Code submission by v3 below.*
> *Kept here to document how decisions evolved.*

Coverage: post creation/editing, drafts, publish/unpublish, SecureStore security, Ghost Admin API JWT, strict TypeScript conventions, Wiki.js documentation.

Out of scope at this stage: Markdown preview, image upload, multi-instance support.

---

### Prompt v2 — full editing support

Full editing strategy added after the decision to cover the complete post lifecycle, including posts created from Ghost Admin (Lexical format).

Key decision: Option B (turndown + marked) over native Lexical (too heavy, not designed for React Native) or simple HTML round-trip (formatting loss). Known limitation documented: advanced Lexical formatting (callouts, Ghost-specific cards) not preserved.

Structural additions: extracted reusable components (`PostListItem`, `TagChipList`, `StatusBadge`), custom hooks (`usePostEditor`, `useSettings`), Posts screen replacing Drafts.

---

### Prompt v3 — final version submitted to Claude Code

Complete version covering all functional scope.

Additions over v2:
- **Markdown preview**: `MarkdownPreview.tsx` via sandboxed WebView (`javaScriptEnabled={false}`, `originWhitelist={[]}`)
- **Image upload**: `ImagePickerButton.tsx` + `useImageUpload.ts`, Android gallery via `expo-image-picker`, Ghost endpoint `/ghost/api/admin/images/upload/`
- **Named multi-instances**: `instanceStore.ts` (Zustand), `useInstances.ts`, `InstanceListItem.tsx`, `SecureKey` evolving to `GHOST_INSTANCES` / `GHOST_ACTIVE_ID`
- `settings.tsx` refactored as a list manager with FAB
- `uploadImage()` added to `ghostClient.ts`
- `app.json` updated (`READ_MEDIA_IMAGES` permission, `expo-image-picker` plugin)

The full prompt is available in [`docs/PROMPT.md`](PROMPT.md).

---

## What the prompt doesn't cover

Some decisions were made outside the prompt, during the Claude Code session or after review:

- Fixing `turndown` compatibility in a Hermes environment without a DOM
- Adjusting `jose` imports to match the actually installed version
- Revising `ConflictError` (409) handling after testing against a live Ghost instance
- All post-generation debugging

These fixes were not handled by Claude Code alone — they required understanding the code, identifying the root cause, and formulating the correction.

---

## Why publish these prompts

Because the process is part of the project.

A code generation prompt is not a magic recipe. It is the result of a design phase that requires knowing the domain well enough to specify the relevant constraints, anticipate problems, and formulate architectural decisions before the model makes them for you.

Someone taking this prompt without the technical context that produced it would probably get code that compiles but doesn't hold up over time.
