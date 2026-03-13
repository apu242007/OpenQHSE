/**
 * React Query hooks for the AI Engine module.
 *
 * All mutations send data to the separate AI micro-service
 * and return typed responses for the analytics dashboard.
 */

'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  IncidentAnalysisRequest,
  IncidentAnalysisResponse,
  AccidentProbabilityRequest,
  AccidentProbabilityResponse,
  FindingClassificationRequest,
  FindingClassificationResponse,
  ExecutiveReportRequest,
  ExecutiveReportResponse,
  OCRResponse,
  SafetyPhotoResponse,
  SafetyChatRequest,
  SafetyChatResponse,
  RecommendationsRequest,
  RecommendationsResponse,
  SuggestControlsRequest,
  SuggestControlsResponse,
  PatternDetectionRequest,
  PatternDetectionResponse,
  SiteRiskScoreResponse,
  RepeatIssuesResponse,
  BenchmarkResponse,
} from '@/types/ai';

// ── Incident Analysis ──────────────────────────────────────

export function useAnalyzeIncident() {
  return useMutation<IncidentAnalysisResponse, Error, IncidentAnalysisRequest>({
    mutationFn: (data) =>
      api.ai.analyzeIncident(data as any) as any,
  });
}

// ── Predict Risk / Accident Probability ────────────────────

export function usePredictRisk() {
  return useMutation<AccidentProbabilityResponse, Error, AccidentProbabilityRequest>({
    mutationFn: (data) =>
      api.ai.predictRisk(data as any) as any,
  });
}

// ── Classify Finding ───────────────────────────────────────

export function useClassifyFinding() {
  return useMutation<FindingClassificationResponse, Error, FindingClassificationRequest>({
    mutationFn: (data) =>
      api.ai.classifyFinding(data as any) as any,
  });
}

// ── Executive Report ───────────────────────────────────────

export function useGenerateReport() {
  return useMutation<ExecutiveReportResponse, Error, ExecutiveReportRequest>({
    mutationFn: (data) =>
      api.ai.generateReport(data as any) as any,
  });
}

// ── OCR Evidence ───────────────────────────────────────────

export function useOcrEvidence() {
  return useMutation<OCRResponse, Error, File>({
    mutationFn: (file) => api.ai.ocrEvidence(file) as any,
  });
}

// ── Analyze Photo ──────────────────────────────────────────

export function useAnalyzePhoto() {
  return useMutation<SafetyPhotoResponse, Error, File>({
    mutationFn: (file) => api.ai.analyzePhoto(file) as any,
  });
}

// ── Safety Chat ────────────────────────────────────────────

export function useSafetyChat() {
  return useMutation<SafetyChatResponse, Error, SafetyChatRequest>({
    mutationFn: (data) =>
      api.ai.safetyChat(data as any) as any,
  });
}

// ── Proactive Recommendations ──────────────────────────────

export function useRecommendations(siteId: string) {
  return useMutation<RecommendationsResponse, Error, RecommendationsRequest>({
    mutationFn: (data) =>
      api.ai.recommendations(siteId, data as any) as any,
  });
}

// ── Suggest Controls ───────────────────────────────────────

export function useSuggestControls() {
  return useMutation<SuggestControlsResponse, Error, SuggestControlsRequest>({
    mutationFn: (data) =>
      api.ai.suggestControls(data as any) as any,
  });
}

// ── Pattern Detection (Analytics) ──────────────────────────

export function useDetectPatterns() {
  return useMutation<PatternDetectionResponse, Error, PatternDetectionRequest>({
    mutationFn: (data) =>
      api.ai.patterns(data as any) as any,
  });
}

// ── Site Risk Score ────────────────────────────────────────

export function useSiteRiskScore(siteId: string) {
  return useMutation<SiteRiskScoreResponse, Error, Record<string, unknown>>({
    mutationFn: (data) =>
      api.ai.riskScore(siteId, data) as any,
  });
}

// ── Repeat Issues ──────────────────────────────────────────

export function useRepeatIssues() {
  return useMutation<RepeatIssuesResponse, Error, { actions: Record<string, unknown>[] }>({
    mutationFn: (data) =>
      api.ai.repeatIssues(data as any) as any,
  });
}

// ── Benchmark KPIs ─────────────────────────────────────────

export function useBenchmarkKpis() {
  return useMutation<BenchmarkResponse, Error, { org_data: Record<string, number>; industry_data?: Record<string, unknown> }>({
    mutationFn: (data) =>
      api.ai.benchmark(data as any) as any,
  });
}
