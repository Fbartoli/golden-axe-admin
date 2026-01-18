'use client'

import { useState, FormEvent, memo } from 'react'
import { ArrowLeft, Plus, Key, Shield, Users, Trash2, Copy } from 'lucide-react'
import { User, UserDetail, ApiKey, AdminKey } from '@/types'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import { cn } from '@/lib/utils'

type ViewMode = 'users' | 'keys' | 'admin-keys'

interface KeyFormState {
  owner_email: string
  origins: string
}

interface UsersTabProps {
  users: User[]
  filteredUsers: User[]
  selectedUser: UserDetail | null
  setSelectedUser: (user: UserDetail | null) => void
  fetchUserDetail: (email: string) => void
  keys: ApiKey[]
  filteredKeys: ApiKey[]
  adminKeys: AdminKey[]
  onRefreshKeys: () => void
  onRefreshAdminKeys: () => void
}

export const UsersTab = memo(function UsersTab({
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
      <div className="space-y-6">
        <Button
          variant="secondary"
          onClick={() => setSelectedUser(null)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Users
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{selectedUser.email}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="p-3 bg-secondary rounded-lg">
                <div className="text-xs text-muted-foreground">API Keys</div>
                <div className="text-2xl font-bold">{selectedUser.keys.filter(k => !k.deleted_at).length}</div>
              </div>
              <div className="p-3 bg-secondary rounded-lg">
                <div className="text-xs text-muted-foreground">Plan Changes</div>
                <div className="text-2xl font-bold">{selectedUser.plans.length}</div>
              </div>
              <div className="p-3 bg-secondary rounded-lg">
                <div className="text-xs text-muted-foreground">Collaborators</div>
                <div className="text-2xl font-bold">{selectedUser.collabs.filter(c => !c.disabled_at).length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedUser.keys.length === 0 ? (
              <p className="text-muted-foreground">No API keys</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Secret</TableHead>
                    <TableHead>Origins</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedUser.keys.map(k => (
                    <TableRow key={k.secret} className={cn(k.deleted_at && "opacity-50")}>
                      <TableCell><code className="text-xs">{k.secret}</code></TableCell>
                      <TableCell>{k.origins.join(', ') || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(k.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={k.deleted_at ? 'secondary' : 'success'}>
                          {k.deleted_at ? 'Deleted' : 'Active'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plan History</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedUser.plans.length === 0 ? (
              <p className="text-muted-foreground">No plan history</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Timeout</TableHead>
                    <TableHead>Connections</TableHead>
                    <TableHead>Queries</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedUser.plans.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell><Badge variant="gold">{p.name}</Badge></TableCell>
                      <TableCell>{p.rate}/s</TableCell>
                      <TableCell>{p.timeout}s</TableCell>
                      <TableCell>{p.connections}</TableCell>
                      <TableCell>{p.queries.toLocaleString()}</TableCell>
                      <TableCell>{p.daimo_tx ? 'Daimo' : p.stripe_customer ? 'Stripe' : '-'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedUser.usage.length === 0 ? (
              <p className="text-muted-foreground">No usage data</p>
            ) : (
              <div className="flex items-end h-40 gap-0.5">
                {selectedUser.usage.slice().reverse().map((u, i) => {
                  const max = Math.max(...selectedUser.usage.map(x => x.queries))
                  const height = max > 0 ? (u.queries / max) * 100 : 0
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-gold rounded-t-sm min-w-2"
                      style={{ height: `${height}%` }}
                      title={`${u.day}: ${u.queries.toLocaleString()} queries`}
                    />
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedUser.collabs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Collaborators</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedUser.collabs.map((c, i) => (
                    <TableRow key={i} className={cn(c.disabled_at && "opacity-50")}>
                      <TableCell>{c.email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.disabled_at ? 'secondary' : 'success'}>
                          {c.disabled_at ? 'Disabled' : 'Active'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === 'users' ? 'gold' : 'outline'}
          onClick={() => setViewMode('users')}
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          Users ({users.length})
        </Button>
        <Button
          variant={viewMode === 'keys' ? 'gold' : 'outline'}
          onClick={() => setViewMode('keys')}
          className="gap-2"
        >
          <Key className="h-4 w-4" />
          API Keys ({keys.filter(k => !k.deleted_at).length})
        </Button>
        <Button
          variant={viewMode === 'admin-keys' ? 'gold' : 'outline'}
          onClick={() => setViewMode('admin-keys')}
          className="gap-2"
        >
          <Shield className="h-4 w-4" />
          Admin Keys ({adminKeys.filter(k => !k.deleted_at).length})
        </Button>
      </div>

      {/* Users View */}
      {viewMode === 'users' && (
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-muted-foreground">No users found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>API Keys</TableHead>
                    <TableHead>Queries (30d)</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(u => (
                    <TableRow key={u.email}>
                      <TableCell className="font-medium">{u.email}</TableCell>
                      <TableCell>
                        {u.plan_name ? (
                          <Badge
                            variant={
                              u.plan_name === 'Pro' ? 'info' :
                              u.plan_name === 'Dedicated' ? 'gold' : 'success'
                            }
                          >
                            {u.plan_name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">No plan</span>
                        )}
                      </TableCell>
                      <TableCell>{u.key_count}</TableCell>
                      <TableCell className="tabular-nums">{u.queries_30d.toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.last_active ? new Date(u.last_active).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => fetchUserDetail(u.email)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* API Keys View */}
      {viewMode === 'keys' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Add API Key</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={addKey} className="flex flex-wrap gap-3">
                <Input
                  className="flex-1 min-w-[200px]"
                  type="email"
                  placeholder="Owner Email"
                  value={keyForm.owner_email}
                  onChange={e => setKeyForm({ ...keyForm, owner_email: e.target.value })}
                  required
                />
                <Input
                  className="flex-1 min-w-[200px]"
                  placeholder="Origins (comma-separated)"
                  value={keyForm.origins}
                  onChange={e => setKeyForm({ ...keyForm, origins: e.target.value })}
                />
                <Button type="submit" variant="gold">
                  <Plus className="h-4 w-4" />
                  Create Key
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Owner</TableHead>
                    <TableHead>Secret</TableHead>
                    <TableHead>Origins</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKeys.map(k => (
                    <TableRow key={k.secret} className={cn(k.deleted_at && "opacity-50")}>
                      <TableCell>{k.owner_email}</TableCell>
                      <TableCell><code className="text-xs">{k.secret.substring(0, 8)}...</code></TableCell>
                      <TableCell>{k.origins.join(', ') || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(k.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={k.deleted_at ? 'secondary' : 'success'}>
                          {k.deleted_at ? 'Deleted' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!k.deleted_at && (
                          <Button variant="danger" size="sm" onClick={() => deleteKey(k.secret)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Admin Keys View */}
      {viewMode === 'admin-keys' && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle>Admin Keys (Unlimited)</CardTitle>
              <CardDescription>
                Admin keys have 1000 connections and 500K queries/month. Use for admin panel and testing.
              </CardDescription>
            </div>
            <Button onClick={createAdminKey} variant="gold">
              <Plus className="h-4 w-4" />
              Create Admin Key
            </Button>
          </CardHeader>
          <CardContent>
            {adminKeys.filter(k => !k.deleted_at).length === 0 ? (
              <p className="text-muted-foreground">
                No admin keys. Click "Create Admin Key" to generate one.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Org</TableHead>
                    <TableHead>Secret</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminKeys.filter(k => !k.deleted_at).map(k => (
                    <TableRow key={k.secret}>
                      <TableCell className="font-medium">{k.org}</TableCell>
                      <TableCell>
                        <button
                          className="font-mono text-xs bg-secondary px-2 py-1 rounded cursor-pointer hover:bg-muted"
                          onClick={() => {
                            navigator.clipboard.writeText(k.secret)
                            alert('Copied to clipboard!')
                          }}
                          title="Click to copy"
                        >
                          {k.secret}
                          <Copy className="h-3 w-3 inline ml-2" />
                        </button>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(k.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="success">Active</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="danger" size="sm" onClick={() => deleteAdminKey(k.secret)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
})
