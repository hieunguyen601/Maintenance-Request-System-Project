import { useEffect, useRef, useState, type FormEvent } from "react";
import { X, MessageSquare, History as HistoryIcon } from "lucide-react";
import api from "../../services/api";
import type { RequestDetail } from "../../services/types";
import { dateTime, errorMessage, label } from "../../services/errors";

export default function RequestDetails({
  requestId,
  onClose,
}: {
  requestId: number;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
    const controller = new AbortController();
    api
      .get<RequestDetail>(`/requests/${requestId}`, {
        signal: controller.signal,
      })
      .then((response) => setDetail(response.data))
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err));
      });
    return () => controller.abort();
  }, [requestId]);
  const sendComment = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await api.post("/comment", { request_id: requestId, message });
      setMessage("");
      setDetail((await api.get<RequestDetail>(`/requests/${requestId}`)).data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  return (
    <dialog
      className="request-dialog"
      ref={dialog}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="request-dialog-title"
    >
      <div className="dialog-inner">
        <div className="workspace-heading">
          <div>
            <span className="eyebrow">Work order #{requestId}</span>
            <h2 id="request-dialog-title">
              {detail?.title || "Request details"}
            </h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close request"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        {!detail && !error && <p role="status">Loading request…</p>}
        {detail && (
          <>
            <div className="detail-tags">
              <span className={`work-badge status-${detail.status}`}>
                {label(detail.status)}
              </span>
              <span className={`work-badge priority-${detail.priority}`}>
                {detail.priority} priority
              </span>
              <span>{detail.category}</span>
            </div>
            <p className="request-description">{detail.description}</p>
            <dl className="detail-grid">
              <div>
                <dt>Apartment</dt>
                <dd>
                  {detail.building} · Unit {detail.unit_number}
                </dd>
              </div>
              <div>
                <dt>Tenant</dt>
                <dd>
                  {detail.tenant_first_name} {detail.tenant_last_name}
                </dd>
              </div>
              <div>
                <dt>Assigned to</dt>
                <dd>
                  {detail.worker_first_name
                    ? `${detail.worker_first_name} ${detail.worker_last_name}`
                    : "Awaiting assignment"}
                </dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{dateTime(detail.created_at)}</dd>
              </div>
              {detail.completed_at && (
                <div>
                  <dt>Completed</dt>
                  <dd>{dateTime(detail.completed_at)}</dd>
                </div>
              )}
            </dl>
            <section className="detail-section">
              <h3>
                <HistoryIcon size={18} /> Status history
              </h3>
              <ol className="activity-list">
                {detail.history.map((item) => (
                  <li key={item.id}>
                    <strong>{label(item.new_status)}</strong>
                    <span>
                      {item.first_name} {item.last_name} ·{" "}
                      {dateTime(item.changed_at)}
                    </span>
                  </li>
                ))}
              </ol>
              {!detail.history.length && (
                <p className="muted">No recorded status changes.</p>
              )}
            </section>
            <section className="detail-section">
              <h3>
                <MessageSquare size={18} /> Conversation
              </h3>
              {!detail.comments.length && (
                <p className="muted">
                  No comments yet. Share an update or ask a question.
                </p>
              )}
              <div className="comment-list">
                {detail.comments.map((comment) => (
                  <article className="comment" key={comment.id}>
                    <header>
                      <strong>
                        {comment.first_name} {comment.last_name}
                      </strong>
                      <span>
                        {comment.role} · {dateTime(comment.created_at)}
                      </span>
                    </header>
                    <p>{comment.message}</p>
                  </article>
                ))}
              </div>
              <form onSubmit={sendComment} className="workspace-form">
                <label htmlFor="comment">Add a comment</label>
                <textarea
                  id="comment"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  maxLength={5000}
                  rows={3}
                />
                <button
                  className="primary-button"
                  disabled={saving || !message.trim()}
                >
                  {saving ? "Sending…" : "Send comment"}
                </button>
              </form>
            </section>
          </>
        )}
      </div>
    </dialog>
  );
}
