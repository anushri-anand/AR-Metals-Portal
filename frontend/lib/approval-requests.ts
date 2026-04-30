import { fetchAPI } from '@/lib/api'

export type ApprovalRequestStatus = 'pending' | 'approved' | 'rejected'

export type ApprovalRequestRecord = {
  id: number
  title: string
  requestType: string
  endpointPath: string
  method: 'POST' | 'PATCH'
  rejectEndpointPath: string
  rejectMethod: 'POST' | 'PATCH'
  company: string
  payload: Record<string, unknown>
  rejectPayload: Record<string, unknown>
  status: ApprovalRequestStatus
  submittedById?: number | null
  submittedByUsername: string
  reviewedById?: number | null
  reviewedByUsername: string
  reviewComment: string
  responseMessage: string
  resultData: Record<string, unknown>
  approvedAt: string | null
  rejectedAt: string | null
  createdAt: string
  updatedAt: string
}

export type ApprovalRequestInput = {
  title: string
  requestType: string
  endpointPath: string
  method?: 'POST' | 'PATCH'
  rejectEndpointPath?: string
  rejectMethod?: 'POST' | 'PATCH'
  company?: string
  payload: Record<string, unknown>
  rejectPayload?: Record<string, unknown>
}

function normalizeApprovalRequest(item: Record<string, unknown>): ApprovalRequestRecord {
  return {
    id: Number(item.id || 0),
    title: String(item.title || ''),
    requestType: String(item.request_type || item.requestType || ''),
    endpointPath: String(item.endpoint_path || item.endpointPath || ''),
    method: String(item.method || 'POST').toUpperCase() as 'POST' | 'PATCH',
    rejectEndpointPath: String(item.reject_endpoint_path || item.rejectEndpointPath || ''),
    rejectMethod: String(item.reject_method || item.rejectMethod || 'POST').toUpperCase() as 'POST' | 'PATCH',
    company: String(item.company || ''),
    payload:
      item.payload && typeof item.payload === 'object'
        ? (item.payload as Record<string, unknown>)
        : {},
    rejectPayload:
      item.reject_payload && typeof item.reject_payload === 'object'
        ? (item.reject_payload as Record<string, unknown>)
        : {},
    status: String(item.status || 'pending') as ApprovalRequestStatus,
    submittedById: item.submitted_by ? Number(item.submitted_by) : null,
    submittedByUsername: String(
      item.submitted_by_username || item.submittedByUsername || ''
    ),
    reviewedById: item.reviewed_by ? Number(item.reviewed_by) : null,
    reviewedByUsername: String(
      item.reviewed_by_username || item.reviewedByUsername || ''
    ),
    reviewComment: String(item.review_comment || item.reviewComment || ''),
    responseMessage: String(item.response_message || item.responseMessage || ''),
    resultData:
      item.result_data && typeof item.result_data === 'object'
        ? (item.result_data as Record<string, unknown>)
        : {},
    approvedAt: item.approved_at || item.approvedAt ? String(item.approved_at || item.approvedAt) : null,
    rejectedAt: item.rejected_at || item.rejectedAt ? String(item.rejected_at || item.rejectedAt) : null,
    createdAt: String(item.created_at || item.createdAt || ''),
    updatedAt: String(item.updated_at || item.updatedAt || ''),
  }
}

export async function submitApprovalRequest(input: ApprovalRequestInput) {
  return normalizeApprovalRequest(
    await fetchAPI('/accounts/approval-requests/', {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        request_type: input.requestType,
        endpoint_path: input.endpointPath,
        method: input.method || 'POST',
        reject_endpoint_path: input.rejectEndpointPath || '',
        reject_method: input.rejectMethod || 'POST',
        company: input.company || '',
        payload: input.payload,
        reject_payload: input.rejectPayload || {},
      }),
    })
  )
}

export function isApprovalRequestApproved(request: ApprovalRequestRecord) {
  return request.status === 'approved'
}

export function getApprovalSubmissionMessage(
  request: ApprovalRequestRecord,
  approvedMessage: string,
  pendingMessage = 'Submitted to admin for approval.'
) {
  return isApprovalRequestApproved(request) ? approvedMessage : pendingMessage
}

export async function getMyApprovalRequests() {
  const data = await fetchAPI('/accounts/approval-requests/')
  return Array.isArray(data) ? data.map(normalizeApprovalRequest) : []
}

export async function getPendingApprovalRequests() {
  const data = await fetchAPI('/accounts/approval-requests/?scope=admin')
  return Array.isArray(data) ? data.map(normalizeApprovalRequest) : []
}

export async function approveApprovalRequest(id: number, comment = '') {
  return normalizeApprovalRequest(
    await fetchAPI(`/accounts/approval-requests/${id}/approve/`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    })
  )
}

export async function rejectApprovalRequest(id: number, comment = '') {
  return normalizeApprovalRequest(
    await fetchAPI(`/accounts/approval-requests/${id}/reject/`, {
      method: 'POST',
      body: JSON.stringify({ comment }),
    })
  )
}
