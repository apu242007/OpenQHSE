'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Clock, Award, BookOpen, ChevronDown, ChevronUp,
  Play, FileText, Video, CheckCircle, XCircle, Loader2,
  Download, AlertTriangle, Timer,
} from 'lucide-react';
import {
  useCourse,
  useAssessments,
  useSubmitAssessment,
  useDownloadCertificate,
  useEnrollUser,
} from '@/hooks/use-training';
import { COURSE_TYPE_CONFIG, ENROLLMENT_STATUS_CONFIG } from '@/types/training';
import type { CourseType, AssessmentQuestion } from '@/types/training';
import { cn, formatDate } from '@/lib/utils';

const QUIZ_TIME_MINUTES = 30;

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: course, isLoading } = useCourse(id);
  const { data: assessments = [] } = useAssessments(id);

  const [openModules, setOpenModules] = useState<Record<number, boolean>>({ 0: true });
  const [quizMode, setQuizMode] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<{
    score: number; passed: boolean;
    results: Array<{ question_id: string; correct: boolean }>
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUIZ_TIME_MINUTES * 60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const submitAssessment = useSubmitAssessment();
  const downloadCert = useDownloadCertificate();
  const enrollUser = useEnrollUser();

  // Countdown timer for quiz
  useEffect(() => {
    if (!quizMode || quizResult) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleSubmitQuiz();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [quizMode, quizResult]);

  const handleSubmitQuiz = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const assessment = assessments[0];
    if (!assessment) return;

    const formattedAnswers = Object.entries(answers).map(([question_id, answer]) => ({
      question_id,
      answer,
    }));

    try {
      const result = await submitAssessment.mutateAsync({
        courseId: id,
        answers: formattedAnswers,
      });
      setQuizResult(result);
    } catch {
      // error handled
    }
  };

  const handleDownloadCertificate = async (enrollmentId: string) => {
    try {
      const blob = await downloadCert.mutateAsync(enrollmentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificado_${enrollmentId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // error handled
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <BookOpen className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground">Curso no encontrado</p>
        <button type="button" onClick={() => router.push('/training')} className="text-sm text-primary hover:underline">
          Volver a capacitación
        </button>
      </div>
    );
  }

  const typeConf = COURSE_TYPE_CONFIG[course.course_type as CourseType];
  const modules = course.content ?? [];
  const hasAssessment = assessments.length > 0;
  const assessment = assessments[0];

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={() => router.push('/training')}
          className="mt-1 rounded-lg border border-border p-2 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ color: typeConf?.color, backgroundColor: `${typeConf?.color}20` }}
            >
              {typeConf?.label ?? course.course_type}
            </span>
            {course.is_mandatory && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Obligatorio</span>
            )}
            {course.validity_months && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                Válido {course.validity_months} meses
              </span>
            )}
          </div>
          <h1 className="mt-1 text-xl font-bold">{course.title}</h1>
          {course.description && (
            <p className="mt-1 text-sm text-muted-foreground">{course.description}</p>
          )}
        </div>
      </div>

      {/* Meta bar */}
      <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>{course.duration_hours}h de duración</span>
        </div>
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4" />
          <span>Nota mínima: {course.passing_score}%</span>
        </div>
        {course.category && (
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span>{course.category}</span>
          </div>
        )}
        {course.applicable_roles && course.applicable_roles.length > 0 && (
          <div className="flex items-center gap-2">
            <span>Roles: {course.applicable_roles.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Quiz mode */}
      {quizMode ? (
        <div className="space-y-6">
          {/* Timer */}
          <div className={cn(
            'flex items-center justify-between rounded-xl border p-4',
            timeLeft < 300 ? 'border-red-400 bg-red-50 dark:bg-red-950/20' : 'border-border bg-card',
          )}>
            <div className="flex items-center gap-3">
              <Timer className={cn('h-5 w-5', timeLeft < 300 ? 'text-red-600' : 'text-muted-foreground')} />
              <span className={cn('text-lg font-mono font-bold', timeLeft < 300 && 'text-red-600')}>
                {formatTime(timeLeft)}
              </span>
              {quizResult === null && <span className="text-sm text-muted-foreground">tiempo restante</span>}
            </div>
            <div className="text-sm text-muted-foreground">
              {Object.keys(answers).length}/{assessment?.questions?.length ?? 0} respondidas
            </div>
          </div>

          {/* Result */}
          {quizResult && (
            <div className={cn(
              'rounded-xl border p-6 text-center',
              quizResult.passed ? 'border-green-400 bg-green-50 dark:bg-green-950/20' : 'border-red-400 bg-red-50 dark:bg-red-950/20',
            )}>
              {quizResult.passed ? (
                <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
              ) : (
                <XCircle className="mx-auto h-12 w-12 text-red-600" />
              )}
              <h2 className={cn('mt-3 text-2xl font-bold', quizResult.passed ? 'text-green-700' : 'text-red-700')}>
                {quizResult.passed ? '¡Aprobado!' : 'No aprobado'}
              </h2>
              <p className="mt-1 text-lg font-semibold">
                Calificación: <span className="text-3xl">{quizResult.score}%</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Nota mínima requerida: {course.passing_score}%</p>
              <div className="mt-4 flex items-center justify-center gap-3">
                {quizResult.passed && (
                  <button
                    type="button"
                    onClick={() => handleDownloadCertificate('placeholder-enrollment-id')}
                    className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                  >
                    <Download className="h-4 w-4" /> Descargar certificado
                  </button>
                )}
                {!quizResult.passed && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuizMode(false);
                      setAnswers({});
                      setQuizResult(null);
                      setTimeLeft(QUIZ_TIME_MINUTES * 60);
                    }}
                    className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
                  >
                    Reintentar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Questions */}
          {!quizResult && assessment && (
            <div className="space-y-4">
              {(assessment.questions as unknown as AssessmentQuestion[]).map((q, qi) => {
                const answered = answers[q.id];
                return (
                  <div key={q.id} className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {qi + 1}
                      </span>
                      <div className="flex-1 space-y-3">
                        <p className="font-medium leading-relaxed">{q.text}</p>
                        {q.type === 'true_false' ? (
                          <div className="flex gap-3">
                            {['Verdadero', 'Falso'].map((opt) => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                                className={cn(
                                  'rounded-lg border px-4 py-2 text-sm transition-all',
                                  answered === opt
                                    ? 'border-primary bg-primary/10 font-medium text-primary'
                                    : 'border-border hover:bg-muted',
                                )}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : q.type === 'open' ? (
                          <textarea
                            value={answers[q.id] ?? ''}
                            onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                            placeholder="Escribe tu respuesta..."
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
                            rows={3}
                          />
                        ) : (
                          <div className="space-y-2">
                            {q.options.map((opt, oi) => (
                              <button
                                key={oi}
                                type="button"
                                onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt.text }))}
                                className={cn(
                                  'w-full rounded-lg border px-4 py-2 text-left text-sm transition-all',
                                  answered === opt.text
                                    ? 'border-primary bg-primary/10 font-medium text-primary'
                                    : 'border-border hover:bg-muted',
                                )}
                              >
                                {opt.text}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={handleSubmitQuiz}
                disabled={submitAssessment.isPending}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitAssessment.isPending ? (
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                ) : (
                  'Enviar respuestas'
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Normal course view */
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Modules — 2/3 */}
          <div className="space-y-3 lg:col-span-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Contenido del curso ({modules.length} módulos)
            </h2>
            {modules.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-12 text-center">
                <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">El contenido del curso aún no está disponible</p>
              </div>
            ) : (
              modules.map((mod, mi) => (
                <div key={mi} className="rounded-xl border border-border bg-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenModules((o) => ({ ...o, [mi]: !o[mi] }))}
                    className="flex w-full items-center justify-between p-4 text-sm font-medium hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {mi + 1}
                      </span>
                      <span>{mod.module_title}</span>
                      <span className="text-xs text-muted-foreground">({mod.slides?.length ?? 0} slides)</span>
                    </div>
                    {openModules[mi] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {openModules[mi] && (
                    <div className="border-t border-border divide-y divide-border">
                      {(mod.slides ?? []).map((slide, si) => (
                        <div key={si} className="flex items-start gap-3 p-4">
                          <SlideIcon type={slide.content_type} />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{slide.title}</p>
                            {slide.content_type === 'text' && slide.content && (
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{slide.content}</p>
                            )}
                            {(slide.content_type === 'video' || slide.content_type === 'pdf') && slide.content_url && (
                              <a
                                href={slide.content_url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 text-xs text-primary hover:underline"
                              >
                                {slide.content_type === 'video' ? 'Ver video' : 'Abrir PDF'}
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Sidebar — 1/3 */}
          <div className="space-y-4">
            {/* Progress */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">Mi progreso</h3>
              <div className="flex flex-col items-center py-4">
                <div className="relative h-20 w-20">
                  <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-muted" strokeWidth="2.5" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      className="stroke-primary transition-all"
                      strokeWidth="2.5"
                      strokeDasharray="0 100"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">0%</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Sin iniciar</p>
              </div>
            </div>

            {/* Assessment */}
            {hasAssessment && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Award className="h-4 w-4 text-primary" />
                  Evaluación final
                </h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  {assessment?.questions?.length ?? 0} preguntas • {QUIZ_TIME_MINUTES} minutos
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAnswers({});
                    setQuizResult(null);
                    setTimeLeft(QUIZ_TIME_MINUTES * 60);
                    setQuizMode(true);
                  }}
                  className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
                >
                  <Play className="mr-2 inline h-4 w-4" />
                  Iniciar evaluación
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SlideIcon({ type }: { type: string }) {
  const icons: Record<string, React.ElementType> = {
    text: FileText,
    video: Video,
    pdf: FileText,
    image: FileText,
  };
  const colors: Record<string, string> = {
    text: 'text-blue-500',
    video: 'text-red-500',
    pdf: 'text-orange-500',
    image: 'text-green-500',
  };
  const Icon = icons[type] ?? FileText;
  return <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', colors[type] ?? 'text-muted-foreground')} />;
}
