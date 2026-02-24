<script lang="ts">
	import {
		init,
		store,
		addCourse,
		updateCourse,
		deleteCourse,
		addQuizToCourse,
		deleteQuiz,
		addAttempt,
		getAttemptsForQuiz
	} from '$lib/storage.svelte';
	import { parseQuizText, quizToText } from '$lib/parser';
	import { QuizEngine } from '$lib/quiz-engine.svelte';
	import { generateId, nowISO, downloadFile } from '$lib/utils';
	import type { Course, TopicQuiz } from '$lib/types';
	import { fade } from 'svelte/transition';
	import RichText from '$lib/RichText.svelte';

	init();

	type View = 'courses' | 'course-detail' | 'quiz-add' | 'quiz-take' | 'quiz-result' | 'help';
	let currentView = $state<View>('courses');
	let selectedCourseId = $state<string | null>(null);
	let selectedQuizId = $state<string | null>(null);
	let engine = $state<QuizEngine | null>(null);

	// Form state
	let newCourseTitle = $state('');
	let quizText = $state('');
	let parseErrors = $state<string[]>([]);
	let editingCourseId = $state<string | null>(null);
	let editingTitle = $state('');
	let confirmDeleteCourse = $state<string | null>(null);
	let confirmDeleteQuiz = $state<string | null>(null);
	let viewBeforeHelp = $state<View>('courses');
	let promptCopied = $state(false);

	let selectedCourse = $derived(
		selectedCourseId ? store.courses.find((c) => c.id === selectedCourseId) : null
	);
	let selectedQuiz = $derived(
		selectedCourse && selectedQuizId
			? selectedCourse.quizzes.find((q) => q.id === selectedQuizId)
			: null
	);

	function createCourse() {
		const title = newCourseTitle.trim();
		if (!title) return;
		const now = nowISO();
		addCourse({ id: generateId(), title, quizzes: [], createdAt: now, updatedAt: now });
		newCourseTitle = '';
	}

	function startEditCourse(course: Course) {
		editingCourseId = course.id;
		editingTitle = course.title;
	}

	function saveEditCourse() {
		if (editingCourseId && editingTitle.trim()) {
			updateCourse(editingCourseId, { title: editingTitle.trim() });
		}
		editingCourseId = null;
	}

	function removeCourse(id: string) {
		deleteCourse(id);
		confirmDeleteCourse = null;
		if (selectedCourseId === id) {
			selectedCourseId = null;
			currentView = 'courses';
		}
	}

	function openCourse(course: Course) {
		selectedCourseId = course.id;
		currentView = 'course-detail';
	}

	function openQuizAdd() {
		quizText = '';
		parseErrors = [];
		currentView = 'quiz-add';
	}

	function parseAndAddQuiz() {
		if (!selectedCourseId) return;
		const result = parseQuizText(quizText, selectedCourseId);
		parseErrors = result.errors;
		if (result.quiz) {
			addQuizToCourse(selectedCourseId, result.quiz);
			currentView = 'course-detail';
			quizText = '';
			parseErrors = [];
		}
	}

	function removeQuiz(courseId: string, quizId: string) {
		deleteQuiz(courseId, quizId);
		confirmDeleteQuiz = null;
	}

	function exportQuiz(quiz: TopicQuiz) {
		downloadFile(`${quiz.title}.txt`, quizToText(quiz));
	}

	function exportCourse(course: Course) {
		const content = course.quizzes.map(quizToText).join('\n\n');
		downloadFile(`${course.title}.txt`, content);
	}

	function startQuiz(quiz: TopicQuiz) {
		engine = new QuizEngine(quiz.questions);
		selectedQuizId = quiz.id;
		currentView = 'quiz-take';
	}

	function submitQuiz() {
		if (!engine || !selectedCourseId || !selectedQuizId) return;
		const attempt = engine.submit(selectedCourseId, selectedQuizId);
		addAttempt(attempt);
		currentView = 'quiz-result';
	}

	function backToCourses() {
		selectedCourseId = null;
		selectedQuizId = null;
		engine = null;
		currentView = 'courses';
	}

	function backToCourse() {
		selectedQuizId = null;
		engine = null;
		currentView = 'course-detail';
	}

	function openHelp() {
		viewBeforeHelp = currentView;
		currentView = 'help';
	}

	function closeHelp() {
		currentView = viewBeforeHelp;
	}

	async function copyPrompt() {
		await navigator.clipboard.writeText(AI_PROMPT);
		promptCopied = true;
		setTimeout(() => (promptCopied = false), 2000);
	}

	const AI_PROMPT = `You are generating a quiz for the Quiz Master app. Use EXACTLY this plain-text format — any deviation will cause a parse error.

━━━ FORMAT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Quiz: [Quiz Title]
---
Q: [Question text]
A) [Option]
B) [Option] *
C) [Option]
Explanation: [Why the correct answer is right]
---
Q: [Next question]
A) [Option] *
B) [Option]
---

━━━ RULES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Start with "Quiz: [Title]" (optional — defaults to "Untitled Quiz")
• Separate every question with "---"
• Each question starts with "Q: "
• Options are lettered A), B), C) … up to F)
• Mark the correct answer by adding " *" at the END of that option line
• Each question needs exactly 1 correct answer and at least 2 options
• "Explanation: " is optional — shown after the user answers

━━━ RICH TEXT (use where appropriate) ━━━━━━━━━━━━━━━━

• Inline code:    \`variable_name\` or \`function()\`
• Inline math:    $x^2 + y = 5$   (LaTeX, no spaces inside $…$)
• Display math:   $$\\int_0^1 x\\,dx$$
• Code block (in the question, before the first option):

  \`\`\`python
  def example():
      return 42
  \`\`\`

  Supported languages: python, javascript, typescript, java, c, cpp,
                       rust, go, bash, sql, html, css, json

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Now create a [10]-question quiz about: [TOPIC]
Difficulty: [beginner / intermediate / advanced]
Focus on: [specific concepts or subtopics]`;
</script>

<div class="min-h-screen bg-white" transition:fade>
	<div class="mx-auto max-w-3xl px-6 py-16">
		<!-- Breadcrumb -->
		<nav class="mb-12 flex items-center gap-2 text-sm text-zinc-400">
			<button
				class="hover:text-zinc-600"
				onclick={backToCourses}
				class:text-zinc-900={currentView === 'courses'}
				class:font-medium={currentView === 'courses'}>Courses</button
			>
			{#if selectedCourse}
				<span>/</span>
				<button
					class="hover:text-zinc-600"
					onclick={backToCourse}
					class:text-zinc-900={currentView === 'course-detail'}
					class:font-medium={currentView === 'course-detail'}>{selectedCourse.title}</button
				>
			{/if}
			{#if currentView === 'quiz-add'}
				<span>/</span>
				<span class="font-medium text-zinc-900">Add Quiz</span>
			{/if}
			{#if currentView === 'quiz-take' && selectedQuiz}
				<span>/</span>
				<span class="font-medium text-zinc-900">{selectedQuiz.title}</span>
			{/if}
			{#if currentView === 'quiz-result'}
				<span>/</span>
				<span class="font-medium text-zinc-900">Results</span>
			{/if}
			{#if currentView === 'help'}
				<span>/</span>
				<span class="font-medium text-zinc-900">Help</span>
			{/if}
			<span class="ml-auto">
				{#if currentView === 'help'}
					<button onclick={closeHelp} class="hover:text-zinc-600">← Back</button>
				{:else}
					<button onclick={openHelp} class="hover:text-zinc-600">Help</button>
				{/if}
			</span>
		</nav>

		<!-- COURSES LIST -->
		{#if currentView === 'courses'}
			<div transition:fade={{ duration: 150 }}>
				<h1 class="mb-8 text-5xl font-bold tracking-tight text-zinc-900">Courses</h1>

				<!-- Create course -->
				<form
					onsubmit={(e) => {
						e.preventDefault();
						createCourse();
					}}
					class="mb-12"
				>
					<input
						bind:value={newCourseTitle}
						placeholder="New course title..."
						class="w-full border-0 border-b border-zinc-200 bg-transparent py-3 text-lg text-zinc-900 placeholder-zinc-300 transition-colors outline-none focus:border-indigo-600"
					/>
				</form>

				{#if store.courses.length === 0}
					<p class="text-zinc-400">No courses yet. Type a title above and press Enter.</p>
				{:else}
					<div class="space-y-1">
						{#each store.courses as course}
							<div class="group flex items-center justify-between border-t border-zinc-100 py-4">
								{#if editingCourseId === course.id}
									<form
										onsubmit={(e) => {
											e.preventDefault();
											saveEditCourse();
										}}
										class="flex-1"
									>
										<input
											bind:value={editingTitle}
											class="w-full border-0 border-b border-indigo-600 bg-transparent py-1 text-lg font-semibold text-zinc-900 outline-none"
											onblur={saveEditCourse}
										/>
									</form>
								{:else}
									<button onclick={() => openCourse(course)} class="flex-1 text-left">
										<span
											class="text-lg font-semibold text-zinc-900 transition-colors hover:text-indigo-600"
											>{course.title}</span
										>
										<span class="ml-3 text-sm text-zinc-400"
											>{course.quizzes.length} quiz{course.quizzes.length !== 1 ? 'zes' : ''}</span
										>
									</button>
								{/if}

								<div
									class="flex items-center gap-3 text-sm opacity-0 transition-opacity group-hover:opacity-100"
								>
									<button
										onclick={() => startEditCourse(course)}
										class="text-zinc-400 hover:text-zinc-600">Edit</button
									>
									{#if confirmDeleteCourse === course.id}
										<span class="text-zinc-500">Remove?</span>
										<button
											onclick={() => removeCourse(course.id)}
											class="font-medium text-red-600 hover:text-red-700">Yes</button
										>
										<button
											onclick={() => (confirmDeleteCourse = null)}
											class="text-zinc-400 hover:text-zinc-600">No</button
										>
									{:else}
										<button
											onclick={() => (confirmDeleteCourse = course.id)}
											class="text-zinc-400 hover:text-red-600">Remove</button
										>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!-- COURSE DETAIL -->
		{#if currentView === 'course-detail' && selectedCourse}
			<div transition:fade={{ duration: 150 }}>
				<h1 class="mb-2 text-4xl font-bold tracking-tight text-zinc-900">{selectedCourse.title}</h1>
				<p class="mb-10 text-sm text-zinc-400">
					{selectedCourse.quizzes.length} topic quiz{selectedCourse.quizzes.length !== 1
						? 'zes'
						: ''}
				</p>

				<div class="mb-8 flex items-center gap-4">
					<button
						onclick={openQuizAdd}
						class="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 active:translate-y-px"
						>Add Quiz</button
					>
					{#if selectedCourse.quizzes.length > 0}
						<button
							onclick={() => exportCourse(selectedCourse!)}
							class="text-sm text-zinc-400 hover:text-zinc-600">Export All</button
						>
					{/if}
				</div>

				{#if selectedCourse.quizzes.length === 0}
					<p class="text-zinc-400">No quizzes yet. Add one by pasting quiz text.</p>
				{:else}
					<div class="space-y-1">
						{#each selectedCourse.quizzes as quiz}
							{@const attempts = getAttemptsForQuiz(quiz.id)}
							<div class="group flex items-center justify-between border-t border-zinc-100 py-4">
								<div class="flex-1">
									<span class="text-lg font-semibold text-zinc-900">{quiz.title}</span>
									<span class="ml-3 text-sm text-zinc-400"
										>{quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''}</span
									>
									{#if attempts.length > 0}
										<span class="ml-3 text-sm text-indigo-500"
											>Best: {Math.max(...attempts.map((a) => a.percentage))}%</span
										>
									{/if}
								</div>

								<div class="flex items-center gap-3 text-sm">
									<button
										onclick={() => startQuiz(quiz)}
										class="font-medium text-indigo-600 hover:text-indigo-700">Take Quiz</button
									>
									<button onclick={() => exportQuiz(quiz)} class="text-zinc-400 hover:text-zinc-600"
										>Export</button
									>
									{#if confirmDeleteQuiz === quiz.id}
										<span class="text-zinc-500">Remove?</span>
										<button
											onclick={() => removeQuiz(selectedCourse!.id, quiz.id)}
											class="font-medium text-red-600">Yes</button
										>
										<button onclick={() => (confirmDeleteQuiz = null)} class="text-zinc-400"
											>No</button
										>
									{:else}
										<button
											onclick={() => (confirmDeleteQuiz = quiz.id)}
											class="text-zinc-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-600"
											>Remove</button
										>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!-- ADD QUIZ -->
		{#if currentView === 'quiz-add'}
			<div transition:fade={{ duration: 150 }}>
				<h1 class="mb-2 text-4xl font-bold tracking-tight text-zinc-900">Add Quiz</h1>
				<p class="mb-8 text-sm text-zinc-400">
					Paste your quiz text below using the supported format.
				</p>

				<div class="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-500">
					<p class="mb-1 font-medium text-zinc-700">Format example:</p>
					<pre class="font-mono">Quiz: My Topic Quiz
---
Q: What does this print?
```python
print("hello")
```
A) hello *
B) world
Explanation: print() outputs its argument.
---
Q: What is $\sqrt{9}$?
A) $x = 2$
B) $x = 3$ *
C) $x = 4$
---
Q: Use `None` to represent…
A) An empty string
B) Zero
C) The absence of a value *</pre>
					<p class="mt-2 text-zinc-400">
						Supports inline code <span class="font-mono">`code`</span>, math
						<span class="font-mono">$expr$</span>, display math
						<span class="font-mono">$$expr$$</span>, and fenced code blocks
						<span class="font-mono">```lang</span> in questions.
					</p>
				</div>

				<textarea
					bind:value={quizText}
					rows="12"
					class="w-full rounded-lg border border-zinc-200 bg-white p-4 font-mono text-sm text-zinc-900 transition-colors outline-none focus:border-indigo-600"
					placeholder="Paste quiz text here..."
				></textarea>

				{#if parseErrors.length > 0}
					<div class="mt-3 space-y-1">
						{#each parseErrors as error}
							<p class="text-sm text-red-600">{error}</p>
						{/each}
					</div>
				{/if}

				<div class="mt-6 flex items-center gap-4">
					<button
						onclick={parseAndAddQuiz}
						disabled={!quizText.trim()}
						class="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
						>Parse & Add</button
					>
					<button onclick={backToCourse} class="text-sm text-zinc-400 hover:text-zinc-600"
						>Cancel</button
					>
				</div>
			</div>
		{/if}

		<!-- TAKE QUIZ -->
		{#if currentView === 'quiz-take' && engine && selectedQuiz}
			<div transition:fade={{ duration: 150 }}>
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-2xl font-bold text-zinc-900">{selectedQuiz.title}</h2>
					<span class="text-sm text-zinc-400"
						>{engine.currentIndex + 1} / {engine.totalQuestions}</span
					>
				</div>

				<!-- Progress -->
				<div class="mb-10 h-1 w-full rounded-full bg-zinc-100">
					<div
						class="h-1 rounded-full bg-indigo-600 transition-all duration-300"
						style="width: {((engine.currentIndex + 1) / engine.totalQuestions) * 100}%"
					></div>
				</div>

				{#if engine.currentQuestion}
					{@const selectedId = engine.getSelectedOption(engine.currentQuestion.id)}
					{@const isAnswered = selectedId !== undefined}

					<div class="mb-8 text-2xl text-zinc-900">
						<RichText text={engine.currentQuestion.text} />
					</div>

					<div class="space-y-3">
						{#each engine.currentQuestion.options as option}
							{@const isCorrect = option.id === engine.currentQuestion.correctOptionId}
							{@const isWrong = isAnswered && option.id === selectedId && !isCorrect}
							<button
								onclick={() => engine!.selectAnswer(engine!.currentQuestion.id, option.id)}
								disabled={isAnswered}
								class="w-full rounded-lg border px-5 py-4 text-left text-lg transition-all disabled:cursor-default {isAnswered
									? isCorrect
										? 'border-emerald-500 bg-emerald-50 text-emerald-900'
										: isWrong
											? 'border-red-400 bg-red-50 text-red-800'
											: 'border-zinc-100 text-zinc-400'
									: 'border-zinc-200 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50'}"
							>
								<RichText text={option.text} inline />
							</button>
						{/each}
					</div>

					{#if isAnswered && engine.currentQuestion.explanation}
						<p class="mt-5 text-sm text-zinc-500">
						<RichText text={engine.currentQuestion.explanation ?? ''} />
					</p>
					{/if}
				{/if}

				<div class="mt-10 flex items-center justify-between">
					<button
						onclick={() => engine!.prev()}
						disabled={engine.isFirst}
						class="text-sm text-zinc-400 hover:text-zinc-600 disabled:opacity-30">Previous</button
					>

					{#if engine.isLast}
						<button
							onclick={submitQuiz}
							disabled={engine.getSelectedOption(engine.currentQuestion?.id ?? '') === undefined}
							class="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-40"
							>Done</button
						>
					{:else}
						<button
							onclick={() => engine!.next()}
							class="text-sm font-medium text-indigo-600 hover:text-indigo-700">Next</button
						>
					{/if}
				</div>
			</div>
		{/if}

		<!-- RESULTS -->
		{#if currentView === 'quiz-result' && engine}
			<div transition:fade={{ duration: 150 }} class="text-center">
				<p class="mb-4 text-sm font-medium tracking-widest text-zinc-400 uppercase">Your Score</p>
				<p class="mb-2 text-8xl font-bold text-indigo-600">{engine.percentage}%</p>
				<p class="mb-12 text-lg text-zinc-500">{engine.score} of {engine.totalQuestions} correct</p>

				<!-- Per-question review -->
				<div class="mx-auto max-w-xl space-y-4 text-left">
					{#each engine.questions as question, i}
						{@const correct = engine.isAnswerCorrect(question.id)}
						{@const selectedId = engine.getSelectedOption(question.id)}
						<div class="border-t border-zinc-100 py-4">
							<div class="mb-2 flex items-start gap-3">
								<span class="mt-0.5 text-lg {correct ? 'text-emerald-500' : 'text-red-500'}">
									{correct ? '\u2713' : '\u2717'}
								</span>
								<div>
									<p class="font-medium text-zinc-900">
										{i + 1}. <RichText text={question.text} />
									</p>
									{#each question.options as option}
										<p
											class="mt-1 text-sm {option.id === question.correctOptionId
												? 'font-medium text-emerald-600'
												: option.id === selectedId && !correct
													? 'text-red-500 line-through'
													: 'text-zinc-400'}"
										>
											<RichText text={option.text} inline />
											{#if option.id === question.correctOptionId}
												<span class="ml-1 text-xs">(correct)</span>
											{/if}
										</p>
									{/each}
									{#if question.explanation}
										<p class="mt-2 text-sm text-zinc-500">
											<RichText text={question.explanation} />
										</p>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>

				<div class="mt-12 flex items-center justify-center gap-6">
					<button
						onclick={() => {
							if (selectedQuiz) startQuiz(selectedQuiz);
						}}
						class="text-sm font-medium text-indigo-600 hover:text-indigo-700">Retake Quiz</button
					>
					<button onclick={backToCourse} class="text-sm text-zinc-400 hover:text-zinc-600"
						>Back to Course</button
					>
				</div>
			</div>
		{/if}

		<!-- HELP -->
		{#if currentView === 'help'}
			<div transition:fade={{ duration: 150 }}>
				<h1 class="mb-10 text-4xl font-bold tracking-tight text-zinc-900">Help</h1>

				<!-- Getting Started -->
				<div class="mb-10">
					<h2 class="mb-4 text-xs font-semibold tracking-widest text-zinc-400 uppercase">
						Getting Started
					</h2>
					<ol class="space-y-4">
						<li class="flex gap-4">
							<span
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white"
								>1</span
							>
							<div>
								<p class="font-medium text-zinc-900">Create a Course</p>
								<p class="mt-0.5 text-sm text-zinc-500">
									Type a course name into the input on the Courses page and press
									<kbd
										class="rounded border border-zinc-200 bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-600"
										>Enter</kbd
									>.
								</p>
							</div>
						</li>
						<li class="flex gap-4">
							<span
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white"
								>2</span
							>
							<div>
								<p class="font-medium text-zinc-900">Add a Quiz</p>
								<p class="mt-0.5 text-sm text-zinc-500">
									Open the course, click <strong>Add Quiz</strong>, paste your quiz text (see
									format below or use the AI prompt), then click
									<strong>Parse &amp; Add</strong>.
								</p>
							</div>
						</li>
						<li class="flex gap-4">
							<span
								class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white"
								>3</span
							>
							<div>
								<p class="font-medium text-zinc-900">Take the Quiz</p>
								<p class="mt-0.5 text-sm text-zinc-500">
									Click <strong>Take Quiz</strong>. Each answer shows immediate colour feedback.
									Navigate with Previous / Next and submit when you reach the last question.
								</p>
							</div>
						</li>
					</ol>
				</div>

				<!-- Quiz Format -->
				<div class="mb-10">
					<h2 class="mb-4 text-xs font-semibold tracking-widest text-zinc-400 uppercase">
						Quiz Format
					</h2>
					<div class="mb-4 overflow-hidden rounded-lg border border-zinc-200">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b border-zinc-200 bg-zinc-50">
									<th class="px-4 py-2.5 text-left font-medium text-zinc-600">Syntax</th>
									<th class="px-4 py-2.5 text-left font-medium text-zinc-600">What it does</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-zinc-100">
								<tr>
									<td class="px-4 py-2.5 font-mono text-xs text-zinc-800">Quiz: Title</td>
									<td class="px-4 py-2.5 text-zinc-600">Set the quiz title (optional)</td>
								</tr>
								<tr>
									<td class="px-4 py-2.5 font-mono text-xs text-zinc-800">---</td>
									<td class="px-4 py-2.5 text-zinc-600">Separate questions</td>
								</tr>
								<tr>
									<td class="px-4 py-2.5 font-mono text-xs text-zinc-800">Q: text</td>
									<td class="px-4 py-2.5 text-zinc-600">Start a question</td>
								</tr>
								<tr>
									<td class="px-4 py-2.5 font-mono text-xs text-zinc-800">A) text</td>
									<td class="px-4 py-2.5 text-zinc-600">Add an answer option (A – F)</td>
								</tr>
								<tr>
									<td class="px-4 py-2.5 font-mono text-xs text-zinc-800">A) text *</td>
									<td class="px-4 py-2.5 text-zinc-600"
										>Mark the correct answer (space&nbsp;+ asterisk at end)</td
									>
								</tr>
								<tr>
									<td class="px-4 py-2.5 font-mono text-xs text-zinc-800">Explanation: text</td>
									<td class="px-4 py-2.5 text-zinc-600"
										>Inline feedback shown after answering (optional)</td
									>
								</tr>
							</tbody>
						</table>
					</div>
					<pre
						class="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 font-mono text-xs text-zinc-700">Quiz: Python Basics
---
Q: What does `len([1, 2, 3])` return?
A) 2
B) 3 *
C) 4
Explanation: len() counts the items in the list.
---
Q: Solve for $x$: $x + 5 = 10$
A) $x = 4$
B) $x = 5$ *</pre>
				</div>

				<!-- Rich Text -->
				<div class="mb-10">
					<h2 class="mb-4 text-xs font-semibold tracking-widest text-zinc-400 uppercase">
						Rich Text
					</h2>
					<div class="mb-3 overflow-hidden rounded-lg border border-zinc-200">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b border-zinc-200 bg-zinc-50">
									<th class="px-4 py-2.5 text-left font-medium text-zinc-600">You type</th>
									<th class="px-4 py-2.5 text-left font-medium text-zinc-600">Renders as</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-zinc-100">
								<tr>
									<td class="px-4 py-2.5 font-mono text-xs text-zinc-800">`code`</td>
									<td class="px-4 py-2.5 text-zinc-600">
										<code
											class="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs text-zinc-800"
											>inline code badge</code
										>
									</td>
								</tr>
								<tr>
									<td class="px-4 py-2.5 font-mono text-xs text-zinc-800">$x^2 + y$</td>
									<td class="px-4 py-2.5 text-zinc-600">inline KaTeX math</td>
								</tr>
								<tr>
									<td class="px-4 py-2.5 font-mono text-xs text-zinc-800">$$x^2 + y$$</td>
									<td class="px-4 py-2.5 text-zinc-600">display math (centred, larger)</td>
								</tr>
								<tr>
									<td class="px-4 py-2.5 font-mono text-xs text-zinc-800">```python … ```</td>
									<td class="px-4 py-2.5 text-zinc-600"
										>syntax-highlighted block (questions only)</td
									>
								</tr>
							</tbody>
						</table>
					</div>
					<p class="text-xs text-zinc-400">
						Supported highlight languages: <span class="font-mono"
							>python, javascript, typescript, java, c, cpp, rust, go, bash, sql, html, css,
							json</span
						>. Code blocks switch between light and dark themes automatically based on your system
						preference.
					</p>
				</div>

				<!-- Generate with AI -->
				<div class="mb-10">
					<h2 class="mb-4 text-xs font-semibold tracking-widest text-zinc-400 uppercase">
						Generate with AI
					</h2>
					<p class="mb-4 text-sm text-zinc-500">
						Use the prompt below with ChatGPT, Claude, Gemini, or any AI assistant. Fill in your
						topic, difficulty, and focus at the bottom, then paste the AI's output directly into the
						<strong class="text-zinc-700">Add Quiz</strong> text box.
					</p>
					<pre
						class="mb-3 max-h-64 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 font-mono text-xs text-zinc-700 whitespace-pre">{AI_PROMPT}</pre>
					<button
						onclick={copyPrompt}
						class="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors {promptCopied
							? 'bg-emerald-600 hover:bg-emerald-700'
							: 'bg-indigo-600 hover:bg-indigo-700'}"
					>
						{promptCopied ? '✓ Copied!' : 'Copy prompt'}
					</button>
				</div>

				<!-- Tips -->
				<div class="mb-10">
					<h2 class="mb-4 text-xs font-semibold tracking-widest text-zinc-400 uppercase">Tips</h2>
					<ul class="space-y-2 text-sm text-zinc-600">
						<li class="flex gap-2">
							<span class="mt-0.5 text-zinc-300">•</span>
							<span
								>Export any quiz as a <code
									class="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs text-zinc-700"
									>.txt</code
								> file using the <strong class="text-zinc-700">Export</strong> button on each quiz card.</span
							>
						</li>
						<li class="flex gap-2">
							<span class="mt-0.5 text-zinc-300">•</span>
							<span
								>Export all quizzes in a course at once with <strong class="text-zinc-700"
									>Export All</strong
								>.</span
							>
						</li>
						<li class="flex gap-2">
							<span class="mt-0.5 text-zinc-300">•</span>
							<span
								>Your best score per quiz is shown in the course view after at least one attempt.</span
							>
						</li>
						<li class="flex gap-2">
							<span class="mt-0.5 text-zinc-300">•</span>
							<span
								>All data is stored in your browser's
								<code class="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs text-zinc-700"
									>localStorage</code
								> — no account or internet connection required.</span
							>
						</li>
						<li class="flex gap-2">
							<span class="mt-0.5 text-zinc-300">•</span>
							<span
								>To back up your quizzes, export them and keep the <code
									class="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs text-zinc-700"
									>.txt</code
								> files. Re-import them at any time by pasting into Add Quiz.</span
							>
						</li>
					</ul>
				</div>
			</div>
		{/if}
	</div>
</div>
