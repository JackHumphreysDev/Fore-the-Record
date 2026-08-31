import { useEffect, useState, type FormEvent } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  buildAdminSubmissionStatusPath,
  buildSubmissionMessagesPath,
  isSubmissionMessage,
  isSubmissionMessagesResponse,
  isSubmissionStatusUpdate,
  SUBMISSION_STATUSES,
  SUBMISSION_STATUS_LABELS,
  type SubmissionMessagesResponse,
  type SubmissionStatus,
  type SubmissionStatusUpdate,
} from './submissionApi.ts'
import './SubmissionConversation.css'

type SubmissionConversationProps = {
  administrator?: boolean
  submissionId: string
  status: SubmissionStatus
  onStatusUpdated?: (update: SubmissionStatusUpdate) => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function readConversationError(
  response: Response,
  fallback: string,
): Promise<string> {
  const body: unknown = await response.json().catch(() => null)

  return isRecord(body) && typeof body.error === 'string'
    ? body.error
    : fallback
}

function formatMessageDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(value))
}

function SubmissionConversation({
  administrator = false,
  submissionId,
  status,
  onStatusUpdated,
}: SubmissionConversationProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [messagesResponse, setMessagesResponse] =
    useState<SubmissionMessagesResponse | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [reply, setReply] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [replyError, setReplyError] = useState('')
  const [replyNotice, setReplyNotice] = useState('')
  const [draftStatus, setDraftStatus] = useState(status)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [statusNotice, setStatusNotice] = useState('')

  useEffect(() => {
    if (!isExpanded) {
      return
    }

    const controller = new AbortController()

    async function loadMessages() {
      setIsLoading(true)
      setLoadError('')

      try {
        const response = await authenticatedFetch(
          buildSubmissionMessagesPath(submissionId, administrator),
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(
            await readConversationError(
              response,
              'We could not load this conversation.',
            ),
          )
        }

        const body: unknown = await response.json()

        if (!isSubmissionMessagesResponse(body)) {
          throw new Error('The conversation returned was incomplete.')
        }

        setMessagesResponse(body)
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setLoadError(
          error instanceof TypeError
            ? 'We could not reach the server. Check your connection and try again.'
            : error instanceof Error
              ? error.message
              : 'We could not load this conversation.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void loadMessages()
    return () => controller.abort()
  }, [administrator, isExpanded, loadAttempt, submissionId])

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSending(true)
    setReplyError('')
    setReplyNotice('')

    try {
      const response = await authenticatedFetch(
        buildSubmissionMessagesPath(submissionId, administrator),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: reply }),
        },
      )

      if (!response.ok) {
        throw new Error(
          await readConversationError(
            response,
            'We could not send your reply. Please try again.',
          ),
        )
      }

      const body: unknown = await response.json()

      if (!isSubmissionMessage(body)) {
        throw new Error('The saved reply returned was incomplete.')
      }

      setMessagesResponse((current) => ({
        messages: [...(current?.messages ?? []), body],
      }))
      setReply('')
      setReplyNotice('Your reply has been added.')
    } catch (error: unknown) {
      setReplyError(
        error instanceof TypeError
          ? 'We could not reach the server. Check your connection and try again.'
          : error instanceof Error
            ? error.message
            : 'We could not send your reply. Please try again.',
      )
    } finally {
      setIsSending(false)
    }
  }

  async function updateStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsUpdatingStatus(true)
    setStatusError('')
    setStatusNotice('')

    try {
      const response = await authenticatedFetch(
        buildAdminSubmissionStatusPath(submissionId),
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: draftStatus }),
        },
      )

      if (!response.ok) {
        throw new Error(
          await readConversationError(
            response,
            'We could not update this request status.',
          ),
        )
      }

      const body: unknown = await response.json()

      if (!isSubmissionStatusUpdate(body)) {
        throw new Error('The updated request status returned was incomplete.')
      }

      setDraftStatus(body.status)
      setStatusNotice(
        `Request marked ${SUBMISSION_STATUS_LABELS[body.status].toLowerCase()}.`,
      )
      onStatusUpdated?.(body)
    } catch (error: unknown) {
      setStatusError(
        error instanceof TypeError
          ? 'We could not reach the server. Check your connection and try again.'
          : error instanceof Error
            ? error.message
            : 'We could not update this request status.',
      )
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const isClosed = status === 'CLOSED'

  return (
    <div className="submission-conversation">
      <button
        className="submission-conversation-toggle"
        type="button"
        aria-expanded={isExpanded}
        onClick={() => setIsExpanded((value) => !value)}
      >
        {isExpanded ? 'Hide conversation' : 'Open conversation'}
        <span aria-hidden="true">{isExpanded ? '−' : '+'}</span>
      </button>

      {isExpanded ? (
        <div className="submission-conversation-panel">
          {administrator ? (
            <form className="submission-status-form" onSubmit={updateStatus}>
              <label>
                Request status
                <select
                  value={draftStatus}
                  disabled={isUpdatingStatus}
                  onChange={(event) => {
                    setDraftStatus(event.target.value as SubmissionStatus)
                    setStatusError('')
                    setStatusNotice('')
                  }}
                >
                  {SUBMISSION_STATUSES.map((submissionStatus) => (
                    <option key={submissionStatus} value={submissionStatus}>
                      {SUBMISSION_STATUS_LABELS[submissionStatus]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                disabled={
                  isUpdatingStatus || draftStatus === status
                }
              >
                {isUpdatingStatus ? 'Updating…' : 'Update status'}
              </button>
              {statusError ? (
                <p className="conversation-message conversation-error" role="alert">
                  {statusError}
                </p>
              ) : null}
              {statusNotice ? (
                <p className="conversation-message conversation-success" role="status">
                  {statusNotice}
                </p>
              ) : null}
            </form>
          ) : null}

          <div className="submission-thread" aria-live="polite">
            <h4>Replies</h4>
            {isLoading ? (
              <div className="conversation-state" role="status">
                Loading replies…
              </div>
            ) : loadError ? (
              <div className="conversation-state conversation-error" role="alert">
                <p>{loadError}</p>
                <button
                  type="button"
                  onClick={() => setLoadAttempt((value) => value + 1)}
                >
                  Try again
                </button>
              </div>
            ) : messagesResponse?.messages.length ? (
              <ol>
                {messagesResponse.messages.map((message) => (
                  <li
                    key={message.id}
                    className={`submission-message submission-message-${message.sender.role.toLowerCase()}`}
                  >
                    <div>
                      <strong>{message.sender.name}</strong>
                      <span>
                        {message.sender.role === 'ADMIN'
                          ? 'Administrator'
                          : 'Player'}
                      </span>
                      <time dateTime={message.createdAt}>
                        {formatMessageDate(message.createdAt)}
                      </time>
                    </div>
                    <p>{message.body}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="conversation-state">
                No replies have been added yet.
              </div>
            )}
          </div>

          {isClosed ? (
            <p className="submission-closed-note">
              This request is closed. An administrator can reopen it if more
              information is needed.
            </p>
          ) : (
            <form className="submission-reply-form" onSubmit={submitReply}>
              <label>
                {administrator ? 'Reply to player' : 'Add a reply'}
                <textarea
                  required
                  minLength={2}
                  maxLength={2000}
                  rows={4}
                  value={reply}
                  disabled={isSending}
                  placeholder={
                    administrator
                      ? 'Ask for more information or explain the resolution'
                      : 'Add any information the administrator requested'
                  }
                  onChange={(event) => {
                    setReply(event.target.value)
                    setReplyError('')
                    setReplyNotice('')
                  }}
                />
                <small>{reply.length}/2000 characters</small>
              </label>
              {replyError ? (
                <p className="conversation-message conversation-error" role="alert">
                  {replyError}
                </p>
              ) : null}
              {replyNotice ? (
                <p className="conversation-message conversation-success" role="status">
                  {replyNotice}
                </p>
              ) : null}
              <button type="submit" disabled={isSending}>
                {isSending ? 'Sending…' : 'Send reply'}
              </button>
            </form>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default SubmissionConversation
