import { loadSession } from '../hooks/authContext'
import { DEV_ADMIN, DEV_PENDING, DEV_USER } from './devBypass'
import { getMockAdminUsers } from './mockData'
import type { CommitteeTodo } from '../types'

/** Dev-bypass session users (e.g. "Preview Admin") aren't seeded into the
 * mock profiles table, so they won't show up in getMockAdminUsers() — check
 * these first so "created by" / "completed by" don't fall through to
 * "Unknown" for whoever is actually signed in during local/E2E testing. */
const KNOWN_SESSION_USERS = [DEV_USER, DEV_ADMIN, DEV_PENDING]

interface TodoRow {
  id: string
  title: string
  description: string | null
  assigned_to: string | null
  status: 'pending' | 'done'
  created_by: string
  completed_by: string | null
  created_at: string
  completed_at: string | null
}

function mockActor() {
  const session = loadSession()
  return {
    id: session?.id ?? DEV_ADMIN.id,
    name: session?.display_name ?? DEV_ADMIN.display_name,
  }
}

function nameFor(id: string | null): string | null {
  if (!id) return null
  const known = KNOWN_SESSION_USERS.find((u) => u.id === id)
  if (known) return known.display_name
  return getMockAdminUsers().find((u) => u.id === id)?.display_name ?? null
}

const seedActor = DEV_ADMIN
const rows: TodoRow[] = [
  {
    id: 'todo-seed-1',
    title: 'Order new match balls',
    description: 'Old ones are flat — check with the usual supplier.',
    assigned_to: DEV_ADMIN.id,
    status: 'pending',
    created_by: seedActor.id,
    completed_by: null,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    completed_at: null,
  },
  {
    id: 'todo-seed-2',
    title: 'Confirm pitch booking for next month',
    description: null,
    assigned_to: null,
    status: 'done',
    created_by: seedActor.id,
    completed_by: seedActor.id,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    completed_at: new Date(Date.now() - 86400000).toISOString(),
  },
]

function toEntry(row: TodoRow): CommitteeTodo {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    assigned_to: row.assigned_to,
    assigned_name: nameFor(row.assigned_to),
    status: row.status,
    created_by: row.created_by,
    created_name: nameFor(row.created_by) ?? 'Unknown',
    completed_by: row.completed_by,
    completed_name: nameFor(row.completed_by),
    created_at: row.created_at,
    completed_at: row.completed_at,
  }
}

export function getMockTodos(): CommitteeTodo[] {
  return [...rows]
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    .map(toEntry)
}

export function addMockTodo(title: string, description: string | null, assignedTo: string | null): CommitteeTodo {
  const actor = mockActor()
  const trimmedTitle = title.trim()
  if (!trimmedTitle) throw new Error('Title is required')

  const row: TodoRow = {
    id: `todo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: trimmedTitle,
    description: description?.trim() || null,
    assigned_to: assignedTo,
    status: 'pending',
    created_by: actor.id,
    completed_by: null,
    created_at: new Date().toISOString(),
    completed_at: null,
  }
  rows.unshift(row)
  return toEntry(row)
}

export function setMockTodoStatus(todoId: string, done: boolean): CommitteeTodo {
  const row = rows.find((r) => r.id === todoId)
  if (!row) throw new Error('Task not found')

  const actor = mockActor()
  if (done) {
    row.status = 'done'
    row.completed_by = actor.id
    row.completed_at = new Date().toISOString()
  } else {
    row.status = 'pending'
    row.completed_by = null
    row.completed_at = null
  }
  return toEntry(row)
}
