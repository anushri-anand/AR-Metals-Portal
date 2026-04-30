'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  approveApprovalRequest,
  getMyApprovalRequests,
  getPendingApprovalRequests,
  rejectApprovalRequest,
  type ApprovalRequestRecord,
} from '@/lib/approval-requests'
import { fetchAPI } from '@/lib/api'
import { hasRoleAccess } from '@/lib/access'

type MeResponse = {
  role: string
}

export default function ApprovalRequestsClient() {
  const [role, setRole] = useState('')
  const [pendingRequests, setPendingRequests] = useState<ApprovalRequestRecord[]>([])
  const [myRequests, setMyRequests] = useState<ApprovalRequestRecord[]>([])
  const [reviewComments, setReviewComments] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const isAdmin = hasRoleAccess(role, ['admin'])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const me = (await fetchAPI('/accounts/me/')) as MeResponse
        const nextRole = typeof me?.role === 'string' ? me.role : ''
        setRole(nextRole)

        const [mine, pending] = await Promise.all([
          getMyApprovalRequests(),
          hasRoleAccess(nextRole, ['admin']) ? getPendingApprovalRequests() : Promise.resolve([]),
        ])

        setMyRequests(mine)
        setPendingRequests(pending)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load approval requests.')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const myRequestsSorted = useMemo(
    () => [...myRequests].sort((left, right) => right.id - left.id),
    [myRequests]
  )

  const pendingRequestsSorted = useMemo(
    () => [...pendingRequests].sort((left, right) => right.id - left.id),
    [pendingRequests]
  )

  async function handleApprove(requestId: number) {
    setActionLoadingId(requestId)
    setMessage('')
    setError('')

    try {
      const updated = await approveApprovalRequest(requestId, reviewComments[requestId] || '')
      setPendingRequests((prev) => prev.filter((request) => request.id !== requestId))
      setMessage('Request approved.')
      setMyRequests((prev) =>
        prev.map((request) => (request.id === updated.id ? updated : request))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request.')
    } finally {
      setActionLoadingId(null)
    }
  }

  async function handleReject(requestId: number) {
    setActionLoadingId(requestId)
    setMessage('')
    setError('')

    try {
      const updated = await rejectApprovalRequest(requestId, reviewComments[requestId] || '')
      setPendingRequests((prev) => prev.filter((request) => request.id !== requestId))
      setMessage('Request rejected.')
      setMyRequests((prev) =>
        prev.map((request) => (request.id === updated.id ? updated : request))
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request.')
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Approvals</h1>
        {message ? <p className="mt-3 text-sm text-green-700">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      {isAdmin ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Pending Requests</h2>
          {loading ? (
            <p className="mt-4 text-slate-700">Loading requests...</p>
          ) : pendingRequestsSorted.length > 0 ? (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                <tr className="bg-slate-100">
                    <TableHead>Title</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Submitted At</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Action</TableHead>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequestsSorted.map((request) => (
                    <tr key={request.id} className="border-b border-slate-200 align-top">
                      <TableCell>{request.title}</TableCell>
                      <TableCell>
                        <ApprovalRequestDetails request={request} />
                      </TableCell>
                      <TableCell>{request.submittedByUsername || '-'}</TableCell>
                      <TableCell>{request.company || '-'}</TableCell>
                      <TableCell>{formatDateTime(request.createdAt)}</TableCell>
                      <TableCell>
                        <textarea
                          value={reviewComments[request.id] || ''}
                          onChange={(event) =>
                            setReviewComments((prev) => ({
                              ...prev,
                              [request.id]: event.target.value,
                            }))
                          }
                          rows={2}
                          className="w-56 rounded-lg border border-slate-300 px-3 py-2 text-black"
                          placeholder="Optional comment"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => void handleApprove(request.id)}
                            disabled={actionLoadingId === request.id}
                            className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white hover:bg-slate-800 disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleReject(request.id)}
                            disabled={actionLoadingId === request.id}
                            className="rounded-lg border border-red-300 px-3 py-2 text-xs text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      </TableCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-slate-700">No pending approval requests.</p>
          )}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">My Requests</h2>
        {loading ? (
          <p className="mt-4 text-slate-700">Loading requests...</p>
        ) : myRequestsSorted.length > 0 ? (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <TableHead>Title</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead>Reviewed By</TableHead>
                  <TableHead>Response</TableHead>
                </tr>
              </thead>
              <tbody>
                {myRequestsSorted.map((request) => (
                  <tr key={request.id} className="border-b border-slate-200">
                    <TableCell>{request.title}</TableCell>
                    <TableCell>
                      <ApprovalRequestDetails request={request} />
                    </TableCell>
                    <TableCell>{request.status}</TableCell>
                    <TableCell>{formatDateTime(request.createdAt)}</TableCell>
                    <TableCell>{request.reviewedByUsername || '-'}</TableCell>
                    <TableCell>{request.responseMessage || '-'}</TableCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-slate-700">No submitted requests yet.</p>
        )}
      </div>
    </div>
  )
}

function TableHead({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-center font-semibold text-slate-900">{children}</th>
}

function TableCell({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-slate-700">{children}</td>
}

function ApprovalRequestDetails({
  request,
}: {
  request: ApprovalRequestRecord
}) {
  return (
    <details className="max-w-md">
      <summary className="cursor-pointer text-sm font-medium text-slate-900">
        View details
      </summary>
      <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
        {JSON.stringify(request.payload, null, 2)}
      </pre>
    </details>
  )
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '-'
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return String(value)
  }

  return parsed.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
