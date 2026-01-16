'use client'

import { useState, FormEvent } from 'react'
import { useAdmin } from '@/components/AdminContext'
import { User, UserDetail, ApiKey, AdminKey } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

type ViewMode = 'users' | 'keys' | 'admin-keys'

interface KeyFormState {
  owner_email: string
  origins: string
}

interface UsersTabProps {
  // User data
  users: User[]
  filteredUsers: User[]
  selectedUser: UserDetail | null
  setSelectedUser: (user: UserDetail | null) => void
  fetchUserDetail: (email: string) => void
  // Key data
  keys: ApiKey[]
  filteredKeys: ApiKey[]
  adminKeys: AdminKey[]
  onRefreshKeys: () => void
  onRefreshAdminKeys: () => void
}

export function UsersTab({
  users,
  filteredUsers,
  selectedUser,
  setSelectedUser,
  fetchUserDetail,
  keys,
  filteredKeys,
  adminKeys,
  onRefreshKeys,
  onRefreshAdminKeys,
}: UsersTabProps) {
  const { colors, styles, darkMode } = useAdmin()
  const [viewMode, setViewMode] = useState<ViewMode>('users')
  const [keyForm, setKeyForm] = useState<KeyFormState>({ owner_email: '', origins: '' })

  async function addKey(e: FormEvent) {
    e.preventDefault()
    await fetch('/api/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner_email: keyForm.owner_email,
        origins: keyForm.origins.split(',').map(o => o.trim()).filter(Boolean),
      }),
    })
    setKeyForm({ owner_email: '', origins: '' })
    onRefreshKeys()
  }

  async function deleteKey(secret: string) {
    if (!confirm('Delete this API key?')) return
    await fetch('/api/keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
    })
    onRefreshKeys()
  }

  async function createAdminKey() {
    await fetch('/api/admin-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org: 'admin' }),
    })
    onRefreshAdminKeys()
  }

  async function deleteAdminKey(secret: string) {
    if (!confirm('Delete this admin key?')) return
    await fetch('/api/admin-key', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
    })
    onRefreshAdminKeys()
  }

  // User detail view
  if (selectedUser) {
    return (
      <>
        <Button
          variant="secondary"
          onClick={() => setSelectedUser(null)}
          style={{ marginBottom: '15px' }}
        >
          ← Back to Users
        </Button>

        <Card colors={colors} darkMode={darkMode} title={selectedUser.email}>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '15px' }}>
            <div style={styles.stat}>
              <strong>API Keys:</strong> {selectedUser.keys.filter((k) => !k.deleted_at).length}
            </div>
            <div style={styles.stat}>
              <strong>Plan Changes:</strong> {selectedUser.plans.length}
            </div>
            <div style={styles.stat}>
              <strong>Collaborators:</strong> {selectedUser.collabs.filter((c) => !c.disabled_at).length}
            </div>
          </div>
        </Card>

        <Card colors={colors} darkMode={darkMode} title="API Keys">
          {selectedUser.keys.length === 0 ? (
            <p style={{ color: colors.textMuted }}>No API keys</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Secret</th>
                  <th style={styles.th}>Origins</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedUser.keys.map((k) => (
                  <tr key={k.secret} style={{ opacity: k.deleted_at ? 0.5 : 1 }}>
                    <td style={styles.td}>
                      <code>{k.secret}</code>
                    </td>
                    <td style={styles.td}>{k.origins.join(', ') || '-'}</td>
                    <td style={styles.td}>{new Date(k.created_at).toLocaleDateString()}</td>
                    <td style={styles.td}>
                      <Badge variant={k.deleted_at ? 'secondary' : 'success'}>
                        {k.deleted_at ? 'Deleted' : 'Active'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card colors={colors} darkMode={darkMode} title="Plan History">
          {selectedUser.plans.length === 0 ? (
            <p style={{ color: colors.textMuted }}>No plan history</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Plan</th>
                  <th style={styles.th}>Rate</th>
                  <th style={styles.th}>Timeout</th>
                  <th style={styles.th}>Connections</th>
                  <th style={styles.th}>Queries</th>
                  <th style={styles.th}>Payment</th>
                  <th style={styles.th}>Date</th>
                </tr>
              </thead>
              <tbody>
                {selectedUser.plans.map((p, i) => (
                  <tr key={i}>
                    <td style={styles.td}>
                      <Badge variant="primary">{p.name}</Badge>
                    </td>
                    <td style={styles.td}>{p.rate}/s</td>
                    <td style={styles.td}>{p.timeout}s</td>
                    <td style={styles.td}>{p.connections}</td>
                    <td style={styles.td}>{p.queries.toLocaleString()}</td>
                    <td style={styles.td}>
                      {p.daimo_tx ? 'Daimo' : p.stripe_customer ? 'Stripe' : '-'}
                    </td>
                    <td style={styles.td}>{new Date(p.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card colors={colors} darkMode={darkMode} title="Usage (Last 30 Days)">
          {selectedUser.usage.length === 0 ? (
            <p style={{ color: colors.textMuted }}>No usage data</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', height: '150px', gap: '2px' }}>
              {selectedUser.usage
                .slice()
                .reverse()
                .map((u, i) => {
                  const max = Math.max(...selectedUser.usage.map((x) => x.queries))
                  const height = max > 0 ? (u.queries / max) * 130 : 0
                  return (
                    <div
                      key={i}
                      role="img"
                      aria-label={`${u.day}: ${u.queries.toLocaleString()} queries`}
                      title={`${u.day}: ${u.queries.toLocaleString()} queries`}
                      style={{
                        flex: 1,
                        height: `${height}px`,
                        background: colors.primary,
                        borderRadius: '2px 2px 0 0',
                        minWidth: '8px',
                      }}
                    />
                  )
                })}
            </div>
          )}
        </Card>

        {selectedUser.collabs.length > 0 && (
          <Card colors={colors} darkMode={darkMode} title="Collaborators">
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Added</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedUser.collabs.map((c, i) => (
                  <tr key={i} style={{ opacity: c.disabled_at ? 0.5 : 1 }}>
                    <td style={styles.td}>{c.email}</td>
                    <td style={styles.td}>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td style={styles.td}>
                      <Badge variant={c.disabled_at ? 'secondary' : 'success'}>
                        {c.disabled_at ? 'Disabled' : 'Active'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </>
    )
  }

  // View mode toggle
  const viewModeStyle = (mode: ViewMode) => ({
    padding: '8px 16px',
    background: viewMode === mode ? colors.primary : colors.cardBg,
    color: viewMode === mode ? '#fff' : colors.text,
    border: `1px solid ${viewMode === mode ? colors.primary : colors.border}`,
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  })

  return (
    <>
      {/* View Mode Toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          style={viewModeStyle('users')}
          onClick={() => setViewMode('users')}
        >
          Users ({users.length})
        </button>
        <button
          style={viewModeStyle('keys')}
          onClick={() => setViewMode('keys')}
        >
          API Keys ({keys.filter(k => !k.deleted_at).length})
        </button>
        <button
          style={viewModeStyle('admin-keys')}
          onClick={() => setViewMode('admin-keys')}
        >
          Admin Keys ({adminKeys.filter(k => !k.deleted_at).length})
        </button>
      </div>

      {/* Users View */}
      {viewMode === 'users' && (
        <Card colors={colors} darkMode={darkMode} title="Users">
          {users.length === 0 ? (
            <p style={{ color: colors.textMuted }}>No users found</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Plan</th>
                  <th style={styles.th}>API Keys</th>
                  <th style={styles.th}>Queries (30d)</th>
                  <th style={styles.th}>Last Active</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.email}>
                    <td style={styles.td}>{u.email}</td>
                    <td style={styles.td}>
                      {u.plan_name ? (
                        <Badge
                          color={
                            u.plan_name === 'Pro'
                              ? '#007bff'
                              : u.plan_name === 'Dedicated'
                              ? '#6f42c1'
                              : '#28a745'
                          }
                        >
                          {u.plan_name}
                        </Badge>
                      ) : (
                        <span style={{ color: colors.textMuted }}>No plan</span>
                      )}
                    </td>
                    <td style={styles.td}>{u.key_count}</td>
                    <td style={styles.td}>{u.queries_30d.toLocaleString()}</td>
                    <td style={styles.td}>
                      {u.last_active ? new Date(u.last_active).toLocaleDateString() : '-'}
                    </td>
                    <td style={styles.td}>
                      <Button variant="primary" size="sm" onClick={() => fetchUserDetail(u.email)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* API Keys View */}
      {viewMode === 'keys' && (
        <>
          <Card colors={colors} darkMode={darkMode} title="Add API Key">
            <form onSubmit={addKey} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <input
                style={{ ...styles.input, flex: '1', minWidth: '200px', marginBottom: 0 }}
                type="email"
                name="owner_email"
                autoComplete="email"
                placeholder="Owner Email"
                value={keyForm.owner_email}
                onChange={(e) => setKeyForm({ ...keyForm, owner_email: e.target.value })}
                required
              />
              <input
                style={{ ...styles.input, flex: '1', minWidth: '200px', marginBottom: 0 }}
                type="text"
                name="origins"
                autoComplete="off"
                placeholder="Origins (comma-separated)"
                value={keyForm.origins}
                onChange={(e) => setKeyForm({ ...keyForm, origins: e.target.value })}
              />
              <Button type="submit">Create Key</Button>
            </form>
          </Card>

          <Card colors={colors} darkMode={darkMode} title="API Keys">
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Owner</th>
                  <th style={styles.th}>Secret</th>
                  <th style={styles.th}>Origins</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredKeys.map((k) => (
                  <tr key={k.secret} style={{ opacity: k.deleted_at ? 0.5 : 1 }}>
                    <td style={styles.td}>{k.owner_email}</td>
                    <td style={styles.td}>
                      <code>{k.secret.substring(0, 8)}…</code>
                    </td>
                    <td style={styles.td}>{k.origins.join(', ') || '-'}</td>
                    <td style={styles.td}>{new Date(k.created_at).toLocaleDateString()}</td>
                    <td style={styles.td}>
                      <Badge variant={k.deleted_at ? 'secondary' : 'success'}>
                        {k.deleted_at ? 'Deleted' : 'Active'}
                      </Badge>
                    </td>
                    <td style={styles.td}>
                      {!k.deleted_at && (
                        <Button variant="danger" size="sm" onClick={() => deleteKey(k.secret)}>
                          Delete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* Admin Keys View */}
      {viewMode === 'admin-keys' && (
        <Card colors={colors} darkMode={darkMode}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <div>
              <h3 style={{ margin: 0 }}>Admin Keys (Unlimited)</h3>
              <p style={{ color: colors.textMuted, fontSize: '13px', margin: '5px 0 0 0' }}>
                Admin keys have 1000 connections and 500K queries/month. Use for admin panel and testing.
              </p>
            </div>
            <Button onClick={createAdminKey}>Create Admin Key</Button>
          </div>

          {adminKeys.filter(k => !k.deleted_at).length === 0 ? (
            <p style={{ color: colors.textMuted }}>
              No admin keys. Click "Create Admin Key" to generate one.
            </p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Org</th>
                  <th style={styles.th}>Secret</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {adminKeys
                  .filter((k) => !k.deleted_at)
                  .map((k) => (
                    <tr key={k.secret}>
                      <td style={styles.td}>{k.org}</td>
                      <td style={styles.td}>
                        <code
                          role="button"
                          tabIndex={0}
                          style={{
                            background: colors.statBg,
                            padding: '2px 6px',
                            borderRadius: '3px',
                            cursor: 'pointer',
                          }}
                          onClick={() => {
                            navigator.clipboard.writeText(k.secret)
                            alert('Copied to clipboard!')
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              navigator.clipboard.writeText(k.secret)
                              alert('Copied to clipboard!')
                            }
                          }}
                          title="Click to copy"
                        >
                          {k.secret}
                        </code>
                      </td>
                      <td style={styles.td}>{new Date(k.created_at).toLocaleDateString()}</td>
                      <td style={styles.td}>
                        <Badge variant="success">Active</Badge>
                      </td>
                      <td style={styles.td}>
                        <Button variant="danger" size="sm" onClick={() => deleteAdminKey(k.secret)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </>
  )
}
