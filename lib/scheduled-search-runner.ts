import { GooglePlacesQuotaError } from "@/lib/google-places"
import { runLeadSearch, SearchRunError, type WebsiteFilter } from "@/lib/search-runner"
import type { SupabaseClient } from "@supabase/supabase-js"

export interface ScheduledSearchRow {
  id: string
  user_id: string
  name: string
  query: string
  location: string
  max_results: number
  website_filter: WebsiteFilter
  find_emails: boolean
  enabled: boolean
  next_run_at: string
}

interface ExecuteScheduledSearchInput {
  supabase: SupabaseClient
  schedule: ScheduledSearchRow
  userEmail: string | null
}

export interface ExecuteScheduledSearchResult {
  scheduleId: string
  runId: string
  status: "success" | "failed"
  searchId: string | null
  totalResults: number
  newResults: number
  error: string | null
}

function nextWeeklyRunIso(from: Date): string {
  return new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
}

function toErrorMessage(error: unknown): string {
  if (error instanceof SearchRunError) {
    return error.message
  }
  if (error instanceof GooglePlacesQuotaError) {
    return "Google API quota has been exceeded. Please try again later."
  }
  if (error instanceof Error) {
    return error.message
  }
  return "Unknown scheduled search error"
}

export async function executeScheduledSearch({
  supabase,
  schedule,
  userEmail,
}: ExecuteScheduledSearchInput): Promise<ExecuteScheduledSearchResult> {
  const runStartedAt = new Date()
  const runStartedAtIso = runStartedAt.toISOString()

  const { data: runRecord, error: runInsertError } = await supabase
    .from("scheduled_search_runs")
    .insert({
      scheduled_search_id: schedule.id,
      user_id: schedule.user_id,
      status: "success",
      run_started_at: runStartedAtIso,
    })
    .select("id")
    .single()

  if (runInsertError || !runRecord) {
    throw new Error("Failed to create scheduled run log")
  }

  try {
    const runResult = await runLeadSearch({
      supabase,
      userId: schedule.user_id,
      userEmail,
      query: schedule.query,
      location: schedule.location,
      maxResults: schedule.max_results,
      websiteFilter: schedule.website_filter,
      findEmails: schedule.find_emails,
      scheduledSearchId: schedule.id,
    })

    const runFinishedAtIso = new Date().toISOString()

    await supabase
      .from("scheduled_search_runs")
      .update({
        search_id: runResult.searchId,
        run_finished_at: runFinishedAtIso,
        total_results: runResult.results.length,
        new_results: runResult.newResultsCount,
        status: "success",
        error_message: null,
      })
      .eq("id", runRecord.id)

    await supabase
      .from("scheduled_searches")
      .update({
        last_run_at: runFinishedAtIso,
        next_run_at: nextWeeklyRunIso(new Date(runFinishedAtIso)),
        last_total_results: runResult.results.length,
        last_new_results: runResult.newResultsCount,
        latest_search_id: runResult.searchId,
        updated_at: runFinishedAtIso,
      })
      .eq("id", schedule.id)

    return {
      scheduleId: schedule.id,
      runId: runRecord.id,
      status: "success",
      searchId: runResult.searchId,
      totalResults: runResult.results.length,
      newResults: runResult.newResultsCount,
      error: null,
    }
  } catch (error) {
    const runFinishedAtIso = new Date().toISOString()
    const errorMessage = toErrorMessage(error)

    await supabase
      .from("scheduled_search_runs")
      .update({
        run_finished_at: runFinishedAtIso,
        total_results: 0,
        new_results: 0,
        status: "failed",
        error_message: errorMessage,
      })
      .eq("id", runRecord.id)

    await supabase
      .from("scheduled_searches")
      .update({
        last_run_at: runFinishedAtIso,
        next_run_at: nextWeeklyRunIso(new Date(runFinishedAtIso)),
        last_total_results: 0,
        last_new_results: 0,
        updated_at: runFinishedAtIso,
      })
      .eq("id", schedule.id)

    return {
      scheduleId: schedule.id,
      runId: runRecord.id,
      status: "failed",
      searchId: null,
      totalResults: 0,
      newResults: 0,
      error: errorMessage,
    }
  }
}
