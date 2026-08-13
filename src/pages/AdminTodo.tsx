import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Navbar } from '../components/ui/Navbar'
import { PageShell } from '../components/ui/PageBackground'
import { createTodo, fetchAdminUsers, fetchTodos, setTodoStatus } from '../lib/clubApi'
import { pageContainerClass } from '../lib/layout'
import type { AdminUserRow, CommitteeTodo } from '../types'

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function TodoItem({ todo, onToggle, toggling }: { todo: CommitteeTodo; onToggle: () => void; toggling: boolean }) {
  return (
    <li className="glass-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`font-medium text-brand-navy ${todo.status === 'done' ? 'line-through opacity-60' : ''}`}>
            {todo.title}
          </p>
          {todo.description && (
            <p className="text-sm text-gray-500 mt-0.5">{todo.description}</p>
          )}
        </div>
        <button
          type="button"
          disabled={toggling}
          onClick={onToggle}
          className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-pill disabled:opacity-50 ${
            todo.status === 'done'
              ? 'bg-brand-light text-brand-navy border border-brand-blue/15'
              : 'bg-brand-blue text-white'
          }`}
        >
          {toggling ? '…' : todo.status === 'done' ? 'Undo' : 'Mark as done'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        {todo.assigned_name && <span>Assigned: <span className="font-medium text-brand-navy">{todo.assigned_name}</span></span>}
        <span>Created by <span className="font-medium text-brand-navy">{todo.created_name}</span> · {formatWhen(todo.created_at)}</span>
        {todo.status === 'done' && todo.completed_name && todo.completed_at && (
          <span>Completed by <span className="font-medium text-brand-navy">{todo.completed_name}</span> · {formatWhen(todo.completed_at)}</span>
        )}
      </div>
    </li>
  )
}

export default function AdminTodo() {
  const [todos, setTodos] = useState<CommitteeTodo[]>([])
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [todoRows, userRows] = await Promise.all([fetchTodos(), fetchAdminUsers()])
      setTodos(todoRows)
      setUsers(userRows)
    } catch {
      toast.error("Couldn't load the to-do list")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    setSaving(true)
    try {
      const created = await createTodo(title, description || null, assignedTo || null)
      setTodos((prev) => [created, ...prev])
      setTitle('')
      setDescription('')
      setAssignedTo('')
      toast.success('Task added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add task")
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (todo: CommitteeTodo) => {
    setTogglingId(todo.id)
    try {
      const updated = await setTodoStatus(todo.id, todo.status !== 'done')
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    } catch {
      toast.error("Couldn't update task")
    } finally {
      setTogglingId(null)
    }
  }

  const pending = todos.filter((t) => t.status === 'pending')
  const done = todos.filter((t) => t.status === 'done')

  return (
    <PageShell>
      <Navbar />
      <div className={pageContainerClass('max-w-lg')}>
        <Link to="/admin" className="text-brand-blue text-sm font-medium">← Admin</Link>
        <div>
          <h1 className="font-display text-2xl text-brand-navy">Committee to-do</h1>
          <p className="text-sm text-gray-500 mt-1">Shared task list for committee and admin.</p>
        </div>

        <form onSubmit={handleCreate} className="glass-card p-4 space-y-3">
          <div>
            <label className="text-sm text-gray-500" htmlFor="todo-title">Title</label>
            <input
              id="todo-title"
              className="input-field mt-1 w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-500" htmlFor="todo-description">Description (optional)</label>
            <textarea
              id="todo-description"
              className="input-field mt-1 w-full min-h-[64px] resize-y"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-gray-500" htmlFor="todo-assignee">Assign to (optional)</label>
            <select
              id="todo-assignee"
              className="input-field mt-1 w-full"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.display_name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full disabled:opacity-50">
            {saving ? 'Adding…' : 'Add task'}
          </button>
        </form>

        {loading ? (
          <div className="glass-card h-24 animate-pulse" />
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="font-display text-lg text-brand-navy">Pending ({pending.length})</h2>
              {pending.length === 0 ? (
                <p className="text-sm text-gray-500">Nothing pending.</p>
              ) : (
                <ul className="space-y-2">
                  {pending.map((t) => (
                    <TodoItem key={t.id} todo={t} onToggle={() => handleToggle(t)} toggling={togglingId === t.id} />
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg text-brand-navy">Done ({done.length})</h2>
              {done.length === 0 ? (
                <p className="text-sm text-gray-500">Nothing completed yet.</p>
              ) : (
                <ul className="space-y-2">
                  {done.map((t) => (
                    <TodoItem key={t.id} todo={t} onToggle={() => handleToggle(t)} toggling={togglingId === t.id} />
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </PageShell>
  )
}
