import type { Question, QuestionAnswer, QuizAttempt, QuizProgress } from './types';
import { generateId, nowISO } from './utils';

export class QuizEngine {
	questions = $state<Question[]>([]);
	currentIndex = $state(0);
	answers = $state<Record<string, string>>({});
	submitted = $state(false);

	currentQuestion = $derived(this.questions[this.currentIndex]);
	totalQuestions = $derived(this.questions.length);
	isFirst = $derived(this.currentIndex === 0);
	isLast = $derived(this.currentIndex === this.questions.length - 1);
	answeredCount = $derived(Object.keys(this.answers).length);
	allAnswered = $derived(Object.keys(this.answers).length === this.questions.length);

	score = $derived.by(() => {
		let correct = 0;
		for (const q of this.questions) {
			if (this.answers[q.id] === q.correctOptionId) {
				correct++;
			}
		}
		return correct;
	});

	percentage = $derived(
		this.questions.length > 0 ? Math.round((this.score / this.questions.length) * 100) : 0
	);

	constructor(questions: Question[]) {
		this.questions = questions;
	}

	selectAnswer = (questionId: string, optionId: string) => {
		if (this.submitted) return;
		this.answers[questionId] = optionId;
	};

	next = () => {
		if (this.currentIndex < this.questions.length - 1) {
			this.currentIndex++;
		}
	};

	prev = () => {
		if (this.currentIndex > 0) {
			this.currentIndex--;
		}
	};

	goTo = (index: number) => {
		if (index >= 0 && index < this.questions.length) {
			this.currentIndex = index;
		}
	};

	submit = (courseId: string, quizId: string): QuizAttempt => {
		this.submitted = true;
		const questionAnswers: QuestionAnswer[] = this.questions.map((q) => {
			const selected = this.answers[q.id] ?? null;
			return {
				questionId: q.id,
				selectedOptionId: selected,
				isCorrect: selected === q.correctOptionId
			};
		});

		return {
			id: generateId(),
			courseId,
			quizId,
			answers: questionAnswers,
			score: this.score,
			totalQuestions: this.questions.length,
			percentage: this.percentage,
			completedAt: nowISO()
		};
	};

	getSelectedOption = (questionId: string): string | undefined => {
		return this.answers[questionId];
	};

	isAnswerCorrect = (questionId: string): boolean | null => {
		if (!this.submitted) return null;
		const selected = this.answers[questionId];
		if (!selected) return false;
		const question = this.questions.find((q) => q.id === questionId);
		return question ? selected === question.correctOptionId : false;
	};

	toProgress = (courseId: string, quizId: string, progressId?: string, startedAt?: string): QuizProgress => {
		return {
			id: progressId ?? generateId(),
			courseId,
			quizId,
			currentIndex: this.currentIndex,
			answers: { ...this.answers },
			questionIds: this.questions.map((q) => q.id),
			startedAt: startedAt ?? nowISO(),
			updatedAt: nowISO()
		};
	};

	static fromProgress(progress: QuizProgress, questions: Question[]): QuizEngine {
		const engine = new QuizEngine(questions);
		engine.currentIndex = Math.min(progress.currentIndex, questions.length - 1);
		engine.answers = { ...progress.answers };
		return engine;
	}
}
