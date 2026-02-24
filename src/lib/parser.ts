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

	function finalizeQuestion() {
		if (!currentQuestionText) return;
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
