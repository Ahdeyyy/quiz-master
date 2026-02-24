# Quiz Master

A minimal, fast quiz app built with SvelteKit 5. Create courses, paste quiz questions in plain text, and take self-graded quizzes with instant per-question feedback.

## Features

- **Courses** — organise quizzes into courses; create, rename, and delete them
- **Plain-text quiz format** — paste questions in a simple text format; the parser handles the rest
- **Instant feedback** — after answering a question, correct and incorrect options are highlighted immediately
- **Per-attempt history** — best score is tracked per quiz across attempts
- **Persistent storage** — all data lives in `localStorage`; no backend required
- **Minimal UI** — clean white/zinc/indigo design, no distractions

## Getting Started

```bash
bun install
bun run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Quiz Text Format

Quizzes are added by pasting plain text. The parser accepts the following format:

```
Quiz: My Topic Quiz
---
Q: What is 2 + 2?
A) 3
B) 4 *
C) 5
D) 6
Explanation: Basic addition.
---
Q: Is the sky blue?
A) Yes *
B) No
```

**Rules:**

- `Quiz:` sets the quiz title (optional; defaults to "Untitled Quiz")
- `---` separates questions
- `Q:` starts a question
- Options are lettered `A)`, `B)`, etc.; append ` *` to mark the correct answer
- `Explanation:` is optional per question and shown as inline feedback after answering
- Each question needs at least 2 options and exactly 1 correct answer

## Rich Text Formatting

Questions, options, and explanations support rich text formatting:

### Inline code

Wrap in single backticks anywhere in a question, option, or explanation:

```
Q: What does `None` mean in Python?
A) An empty string
B) The absence of a value *
```

### Inline math

Wrap LaTeX in single dollar signs (no surrounding spaces):

```
Q: Solve for $x$: $2x + 3 = 7$
A) $x = 1$
B) $x = 2$ *
```

### Display math (block)

Wrap LaTeX in double dollar signs — renders centred and larger:

```
Q: Evaluate $$\int_0^1 x\,dx$$
A) $\tfrac{1}{2}$ *
B) $1$
```

### Fenced code blocks

Use triple backticks with an optional language tag. The fence must appear in the question, before the first option:

```
Q: What does this function return?
```python
def add(a, b):
    return a + b
```
A) None
B) a + b *
```

**Supported highlight languages:** `javascript`, `typescript`, `python`, `rust`, `go`, `java`, `c`, `cpp`, `bash`, `json`, `html`, `css`, `sql`. Unknown language tags fall back to plain monospace.

Code blocks automatically switch between light and dark colour schemes based on your system preference (`prefers-color-scheme`).

## Project Structure

```
src/
  lib/
    types.ts              # Data model types (Course, Question, QuizAttempt, …)
    parser.ts             # Plain-text → quiz object parser
    quiz-engine.svelte.ts # Reactive quiz session state (QuizEngine class)
    storage.svelte.ts     # localStorage persistence via Svelte 5 $state
    utils.ts              # generateId, nowISO helpers
  routes/
    +layout.svelte        # Root layout
    +layout.ts            # Layout load function
    +page.svelte          # Full app (courses → quiz-take → results)
```

## Scripts

| Command           | Description                      |
| ----------------- | -------------------------------- |
| `bun run dev`     | Start dev server                 |
| `bun run build`   | Production build                 |
| `bun run preview` | Preview production build locally |
| `bun run check`   | Svelte type-check                |
| `bun run lint`    | Lint + format check              |
| `bun run format`  | Auto-format with Prettier        |

## Stack

- [SvelteKit](https://kit.svelte.dev/) 2 + [Svelte](https://svelte.dev/) 5 (runes)
- [Tailwind CSS](https://tailwindcss.com/) v4
- [TypeScript](https://www.typescriptlang.org/)
- [Bun](https://bun.sh/) as package manager
- Deployed via [`@sveltejs/adapter-vercel`](https://kit.svelte.dev/docs/adapter-vercel)
