import type { TopicQuiz, Question, Option } from './types';
import { generateId, nowISO } from './utils';

export interface ParseResult {
	quiz: TopicQuiz | null;
	errors: string[];
}

export function parseQuizText(text: string, courseId: string): ParseResult {
	const lines = text.split('\n');
	const errors: string[] = [];
	let quizTitle = 'Untitled Quiz';
	const questions: Question[] = [];

	let currentQuestionText: string | null = null;
	let currentOptions: Option[] = [];
	let correctOptionId: string | null = null;
	let currentExplanation: string | undefined;
	let questionNumber = 0;

	// Multi-line / code-block state
	// When true, all lines (including blank ones) are appended verbatim to
	// currentQuestionText until the closing ``` fence is found.
	let inCodeBlock = false;

	function finalizeQuestion() {
		if (!currentQuestionText) return;

		// Guard: an unclosed code fence means malformed input
		if (inCodeBlock) {
			questionNumber++;
			errors.push(`Question ${questionNumber} has an unclosed code block (\`\`\`)`);
			resetQuestion();
			inCodeBlock = false;
			return;
		}

		questionNumber++;

		if (currentOptions.length < 2) {
			errors.push(`Question ${questionNumber} has fewer than 2 options`);
			resetQuestion();
			return;
		}
		if (!correctOptionId) {
			errors.push(`Question ${questionNumber} has no correct answer marked with *`);
			resetQuestion();
			return;
		}

		questions.push({
			id: generateId(),
			text: currentQuestionText,
			options: [...currentOptions],
			correctOptionId,
			explanation: currentExplanation
		});

		resetQuestion();
	}

	function resetQuestion() {
		currentQuestionText = null;
		currentOptions = [];
		correctOptionId = null;
		currentExplanation = undefined;
	}

	for (const line of lines) {
		const trimmed = line.trim();

		// ── Inside a fenced code block ──────────────────────────────────────
		// Append every line verbatim (preserving indentation) to the question
		// text. Empty lines are NOT skipped here.
		if (inCodeBlock) {
			if (trimmed === '```') {
				// Closing fence — append it and exit code-block mode
				currentQuestionText += '\n```';
				inCodeBlock = false;
			} else {
				// Regular code line — append with original indentation
				currentQuestionText += '\n' + line;
			}
			continue;
		}

		// ── Normal mode — skip truly blank lines ────────────────────────────
		if (!trimmed) continue;

		if (trimmed.toLowerCase().startsWith('quiz:')) {
			quizTitle = trimmed.slice(5).trim() || 'Untitled Quiz';
		} else if (trimmed === '---') {
			finalizeQuestion();
		} else if (trimmed.startsWith('Q:') || trimmed.startsWith('q:')) {
			if (currentQuestionText) {
				finalizeQuestion();
			}
			currentQuestionText = trimmed.slice(2).trim();
		} else if (
			// Opening code fence ─ only valid while accumulating a question
			// (before any options have been added)
			trimmed.startsWith('```') &&
			currentQuestionText !== null &&
			currentOptions.length === 0
		) {
			currentQuestionText += '\n' + trimmed;
			inCodeBlock = true;
		} else if (/^[A-Za-z]\)/.test(trimmed)) {
			const isCorrect = trimmed.endsWith('*');
			const optionText = trimmed
				.slice(2)
				.replace(/\*\s*$/, '')
				.trim();
			const option: Option = { id: generateId(), text: optionText };
			currentOptions.push(option);
			if (isCorrect) {
				correctOptionId = option.id;
			}
		} else if (trimmed.toLowerCase().startsWith('explanation:')) {
			currentExplanation = trimmed.slice(12).trim();
		} else if (currentQuestionText !== null && currentOptions.length === 0) {
			// Continuation line for question text (e.g. second line of a question
			// that hasn't started options yet, or inline math / code annotations)
			currentQuestionText += '\n' + trimmed;
		}
	}

	// Finalize last question if not terminated by ---
	finalizeQuestion();

	if (questions.length === 0) {
		errors.push('No valid questions found. Use the format: Q: question text, A) option *');
		return { quiz: null, errors };
	}

	const now = nowISO();
	const quiz: TopicQuiz = {
		id: generateId(),
		courseId,
		title: quizTitle,
		questions,
		createdAt: now,
		updatedAt: now
	};

	return { quiz, errors };
}

const OPTION_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function quizToText(quiz: TopicQuiz): string {
	const lines: string[] = [`Quiz: ${quiz.title}`, ''];

	for (const question of quiz.questions) {
		// question.text may be multi-line (e.g. contains a fenced code block);
		// pushing the whole string and joining with \n produces correct output.
		lines.push(`Q: ${question.text}`);
		question.options.forEach((option, i) => {
			const letter = OPTION_LETTERS[i] ?? String.fromCharCode(65 + i);
			const marker = option.id === question.correctOptionId ? ' *' : '';
			lines.push(`${letter}) ${option.text}${marker}`);
		});
		if (question.explanation) {
			lines.push(`Explanation: ${question.explanation}`);
		}
		lines.push('---');
	}

	return lines.join('\n');
}
