import type { Course, TopicQuiz, QuizAttempt } from './types';
import { nowISO } from './utils';

const COURSES_KEY = 'quizmaster_courses';
const ATTEMPTS_KEY = 'quizmaster_attempts';

function loadFromStorage<T>(key: string, fallback: T): T {
	if (typeof window === 'undefined') return fallback;
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : fallback;
	} catch {
		return fallback;
	}
}

function saveToStorage<T>(key: string, value: T): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem(key, JSON.stringify(value));
}

export const store = $state<{ courses: Course[]; attempts: QuizAttempt[] }>({
	courses: [],
	attempts: []
});

let initialized = $state(false);

export function init() {
	if (initialized) return;
	if (typeof window === 'undefined') return;
	store.courses = loadFromStorage<Course[]>(COURSES_KEY, []);
	store.attempts = loadFromStorage<QuizAttempt[]>(ATTEMPTS_KEY, []);
	initialized = true;
}

$effect.root(() => {
	$effect(() => {
		const courses = $state.snapshot(store.courses);
		if (!initialized) return;
		saveToStorage(COURSES_KEY, courses);
	});
	$effect(() => {
		const attempts = $state.snapshot(store.attempts);
		if (!initialized) return;
		saveToStorage(ATTEMPTS_KEY, attempts);
	});
});

// Course CRUD
export function addCourse(course: Course): void {
	store.courses.push(course);
}

export function getCourse(id: string): Course | undefined {
	return store.courses.find((c) => c.id === id);
}

export function updateCourse(id: string, updates: Partial<Pick<Course, 'title' | 'description'>>): void {
	const course = store.courses.find((c) => c.id === id);
	if (!course) return;
	if (updates.title !== undefined) course.title = updates.title;
	if (updates.description !== undefined) course.description = updates.description;
	course.updatedAt = nowISO();
}

export function deleteCourse(id: string): void {
	const idx = store.courses.findIndex((c) => c.id === id);
	if (idx !== -1) store.courses.splice(idx, 1);
	store.attempts = store.attempts.filter((a) => a.courseId !== id);
}

// Quiz CRUD
export function addQuizToCourse(courseId: string, quiz: TopicQuiz): void {
	const course = store.courses.find((c) => c.id === courseId);
	if (!course) return;
	course.quizzes.push(quiz);
	course.updatedAt = nowISO();
}

export function updateQuiz(
	courseId: string,
	quizId: string,
	updates: Partial<Pick<TopicQuiz, 'title' | 'description' | 'questions'>>
): void {
	const course = store.courses.find((c) => c.id === courseId);
	if (!course) return;
	const quiz = course.quizzes.find((q) => q.id === quizId);
	if (!quiz) return;
	if (updates.title !== undefined) quiz.title = updates.title;
	if (updates.description !== undefined) quiz.description = updates.description;
	if (updates.questions !== undefined) quiz.questions = updates.questions;
	quiz.updatedAt = nowISO();
	course.updatedAt = nowISO();
}

export function deleteQuiz(courseId: string, quizId: string): void {
	const course = store.courses.find((c) => c.id === courseId);
	if (!course) return;
	const idx = course.quizzes.findIndex((q) => q.id === quizId);
	if (idx !== -1) course.quizzes.splice(idx, 1);
	course.updatedAt = nowISO();
	store.attempts = store.attempts.filter((a) => a.quizId !== quizId);
}

// Attempts
export function addAttempt(attempt: QuizAttempt): void {
	store.attempts.push(attempt);
}

export function getAttemptsForQuiz(quizId: string): QuizAttempt[] {
	return store.attempts.filter((a) => a.quizId === quizId);
}
