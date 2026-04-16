import { useFetch } from "./useDataFetching"
import { dashboardService } from "../services/dashboardService"
import { eventService } from "../services/eventService"
import { organizationService } from "../services/organizationService"
import { financeService } from "../services/financeService"
import { supportService } from "../services/supportService"

/**
 * Hook for fetching dashboard summary data
 */
export function useDashboardSummary() {
  return useFetch(dashboardService.getGlobalSummary)
}

/**
 * Hook for fetching organization comparison data
 */
export function useDashboardComparison() {
  return useFetch(dashboardService.getOrganizationComparison)
}

/**
 * Hook for fetching all events
 */
export function useAdminEvents() {
  return useFetch(eventService.fetchEvents)
}

/**
 * Hook for fetching event performance data
 */
export function useEventPerformance(eventId) {
  return useFetch(
    () => eventService.getEventPerformance(eventId),
    [eventId]
  )
}

/**
 * Hook for fetching all organizations
 */
export function useAdminOrganizations() {
  return useFetch(organizationService.fetchOrganizations)
}

/**
 * Hook for fetching financial summary
 */
export function useFinancialSummary() {
  return useFetch(financeService.getFinancialSummary)
}

/**
 * Hook for fetching financial activity
 */
export function useFinancialActivity(filters) {
  return useFetch(
    () => financeService.getFinancialActivity(filters),
    [JSON.stringify(filters)]
  )
}

/**
 * Hook for fetching payout requests
 */
export function usePayoutRequests() {
  return useFetch(financeService.getPayoutRequests)
}

/**
 * Hook for fetching support tickets
 */
export function useSupportTickets() {
  return useFetch(supportService.fetchSupportTickets)
}

/**
 * Hook for fetching ticket details
 */
export function useTicketDetail(ticketId) {
  return useFetch(
    () => supportService.getTicketDetail(ticketId),
    [ticketId]
  )
}
