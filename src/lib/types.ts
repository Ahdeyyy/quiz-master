export interface Option {
	id: string;
	text: string;
}

export interface Question {
	id: string;
	text: string;
	options: Option[];
	correctOptionId: string;
	explanation?: string;
}

export interface TopicQuiz {
	id: string;
	courseId: string;
	title: string;
	description?: string;
	questions: Question[];
	createdAt: string;
	updatedAt: string;
}

export interface Course {
	id: string;
	title: string;
	description?: string;
	quizzes: TopicQuiz[];
	createdAt: string;
	updatedAt: string;
}

export interface QuestionAnswer {
	questionId: string;
	selectedOptionId: string | null;
	isCorrect: boolean;
}

export interface QuizAttempt {
	id: string;
	courseId: string;
	quizId: string;
	answers: QuestionAnswer[];
	score: number;
	totalQuestions: number;
	percentage: number;
	completedAt: string;
}

export interface QuizProgress {
	id: string;
	courseId: string;
	quizId: string;
	currentIndex: number;
	answers: Record<string, string>;
	questionIds: string[];
	startedAt: string;
	updatedAt: string;
}
