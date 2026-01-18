'use client'

import { useState, FormEvent, memo } from 'react'
import { Plus, Send, Trash2, Bell, Mail, Zap } from 'lucide-react'
import { NotificationSettings, Network } from '@/types'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import { cn } from '@/lib/utils'

interface NotificationsTabProps {
  settings: NotificationSettings | null
  networks: Network[]
  onRefresh: () => void
}

export const NotificationsTab = memo(function NotificationsTab({ settings, networks, onRefresh }: NotificationsTabProps) {
  const [webhookForm, setWebhookForm] = useState({ name: '', url: '' })
  const [emailForm, setEmailForm] = useState({ name: '', email: '' })
  const [ruleForm, setRuleForm] = useState({
    name: '',
    type: 'sync_behind',
    chain: '',
    threshold: '',
    comparison: 'gt',
    severity: 'warning',
  })

  async function addWebhook(e: FormEvent) {
    e.preventDefault()
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_webhook', ...webhookForm }),
    })
    setWebhookForm({ name: '', url: '' })
    onRefresh()
  }

  async function testWebhook(url: string) {
    await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'test',
        severity: 'info',
        message: 'Test notification from Horusblock Admin',
        timestamp: new Date().toISOString(),
      }),
    })
    alert('Test notification sent!')
  }

  async function toggleWebhook(id: number, enabled: boolean) {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_webhook', id, enabled }),
    })
    onRefresh()
  }

  async function deleteWebhook(id: number) {
    if (!confirm('Delete this webhook?')) return
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_webhook', id }),
    })
    onRefresh()
  }

  async function addEmail(e: FormEvent) {
    e.preventDefault()
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_email', ...emailForm }),
    })
    setEmailForm({ name: '', email: '' })
    onRefresh()
  }

  async function toggleEmail(id: number, enabled: boolean) {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_email', id, enabled }),
    })
    onRefresh()
  }

  async function deleteEmail(id: number) {
    if (!confirm('Delete this email notification?')) return
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_email', id }),
    })
    onRefresh()
  }

  async function addRule(e: FormEvent) {
    e.preventDefault()
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_rule',
        name: ruleForm.name,
        type: ruleForm.type,
        chain: ruleForm.chain ? parseInt(ruleForm.chain) : null,
        threshold: parseFloat(ruleForm.threshold),
        comparison: ruleForm.comparison,
        severity: ruleForm.severity,
      }),
    })
    setRuleForm({ name: '', type: 'sync_behind', chain: '', threshold: '', comparison: 'gt', severity: 'warning' })
    onRefresh()
  }

  async function toggleRule(id: number, enabled: boolean) {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_rule', id, enabled }),
    })
    onRefresh()
  }

  async function deleteRule(id: number) {
    if (!confirm('Delete this rule?')) return
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_rule', id }),
    })
    onRefresh()
  }

  return (
    <div className="space-y-6">
      {/* Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Webhook Notifications
          </CardTitle>
          <CardDescription>
            Send HTTP POST requests to URLs when alerts are triggered.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addWebhook} className="flex flex-wrap gap-3 mb-6">
            <Input
              className="flex-1 min-w-[150px]"
              placeholder="Name (e.g., Slack)"
              value={webhookForm.name}
              onChange={e => setWebhookForm({ ...webhookForm, name: e.target.value })}
              required
            />
            <Input
              className="flex-[2] min-w-[250px]"
              type="url"
              placeholder="URL (e.g., https://hooks.slack.com/...)"
              value={webhookForm.url}
              onChange={e => setWebhookForm({ ...webhookForm, url: e.target.value })}
              required
            />
            <Button type="submit" variant="gold">
              <Plus className="h-4 w-4" />
              Add Webhook
            </Button>
          </form>

          {settings?.webhooks && settings.webhooks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Triggered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.webhooks.map(w => (
                  <TableRow key={w.id} className={cn(!w.enabled && "opacity-50")}>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell>
                      <code className="text-xs">{w.url.substring(0, 40)}...</code>
                    </TableCell>
                    <TableCell>
                      {w.last_error ? (
                        <Badge variant="error" title={w.last_error}>Error</Badge>
                      ) : (
                        <Badge variant={w.enabled ? 'success' : 'secondary'}>
                          {w.enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {w.last_triggered_at ? new Date(w.last_triggered_at).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => testWebhook(w.url)}>
                          <Send className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant={w.enabled ? 'secondary' : 'success'}
                          onClick={() => toggleWebhook(w.id, !w.enabled)}
                        >
                          {w.enabled ? 'Disable' : 'Enable'}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => deleteWebhook(w.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">No webhooks configured</p>
          )}
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Send email alerts when issues are detected. (Requires POSTMARK_KEY env var)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addEmail} className="flex flex-wrap gap-3 mb-6">
            <Input
              className="flex-1 min-w-[150px]"
              placeholder="Name (e.g., On-call)"
              value={emailForm.name}
              onChange={e => setEmailForm({ ...emailForm, name: e.target.value })}
              required
            />
            <Input
              className="flex-[2] min-w-[250px]"
              type="email"
              placeholder="Email address"
              value={emailForm.email}
              onChange={e => setEmailForm({ ...emailForm, email: e.target.value })}
              required
            />
            <Button type="submit" variant="gold">
              <Plus className="h-4 w-4" />
              Add Email
            </Button>
          </form>

          {settings?.emails && settings.emails.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sent</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.emails.map(e => (
                  <TableRow key={e.id} className={cn(!e.enabled && "opacity-50")}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell>{e.email}</TableCell>
                    <TableCell>
                      <Badge variant={e.enabled ? 'success' : 'secondary'}>
                        {e.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {e.last_sent_at ? new Date(e.last_sent_at).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant={e.enabled ? 'secondary' : 'success'}
                          onClick={() => toggleEmail(e.id, !e.enabled)}
                        >
                          {e.enabled ? 'Disable' : 'Enable'}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => deleteEmail(e.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">No email notifications configured</p>
          )}
        </CardContent>
      </Card>

      {/* Custom Alert Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Custom Alert Rules
          </CardTitle>
          <CardDescription>
            Define custom thresholds for triggering alerts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addRule} className="flex flex-wrap gap-3 items-end mb-6">
            <div className="space-y-1 flex-1 min-w-[150px]">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                placeholder="e.g., High latency alert"
                value={ruleForm.name}
                onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1 min-w-[130px]">
              <Label className="text-xs text-muted-foreground">Metric</Label>
              <Select value={ruleForm.type} onValueChange={v => setRuleForm({ ...ruleForm, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {settings?.ruleTypes?.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  )) || (
                    <>
                      <SelectItem value="sync_behind">Blocks Behind</SelectItem>
                      <SelectItem value="cpu_usage">CPU Usage</SelectItem>
                      <SelectItem value="memory_usage">Memory Usage</SelectItem>
                      <SelectItem value="rpc_latency">RPC Latency</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            {(ruleForm.type === 'sync_behind' || ruleForm.type === 'rpc_latency') && (
              <div className="space-y-1 min-w-[100px]">
                <Label className="text-xs text-muted-foreground">Chain ID</Label>
                <Input
                  placeholder="e.g., 1"
                  value={ruleForm.chain}
                  onChange={e => setRuleForm({ ...ruleForm, chain: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-1 min-w-[80px]">
              <Label className="text-xs text-muted-foreground">Comparison</Label>
              <Select value={ruleForm.comparison} onValueChange={v => setRuleForm({ ...ruleForm, comparison: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gt">&gt;</SelectItem>
                  <SelectItem value="gte">&gt;=</SelectItem>
                  <SelectItem value="lt">&lt;</SelectItem>
                  <SelectItem value="lte">&lt;=</SelectItem>
                  <SelectItem value="eq">=</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 min-w-[100px]">
              <Label className="text-xs text-muted-foreground">Threshold</Label>
              <Input
                type="number"
                placeholder="e.g., 1000"
                value={ruleForm.threshold}
                onChange={e => setRuleForm({ ...ruleForm, threshold: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1 min-w-[100px]">
              <Label className="text-xs text-muted-foreground">Severity</Label>
              <Select value={ruleForm.severity} onValueChange={v => setRuleForm({ ...ruleForm, severity: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" variant="gold">
              <Plus className="h-4 w-4" />
              Add Rule
            </Button>
          </form>

          {settings?.rules && settings.rules.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Triggered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.rules.map(r => (
                  <TableRow key={r.id} className={cn(!r.enabled && "opacity-50")}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-secondary px-2 py-1 rounded">
                        {r.type}
                        {r.chain && ` (chain ${r.chain})`}
                        {' '}{r.comparison === 'gt' ? '>' : r.comparison === 'gte' ? '>=' : r.comparison === 'lt' ? '<' : r.comparison === 'lte' ? '<=' : '='}{' '}
                        {r.threshold}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={r.severity === 'critical' ? 'error' : r.severity === 'warning' ? 'warning' : 'info'}
                      >
                        {r.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.enabled ? 'success' : 'secondary'}>
                        {r.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.last_triggered_at ? new Date(r.last_triggered_at).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant={r.enabled ? 'secondary' : 'success'}
                          onClick={() => toggleRule(r.id, !r.enabled)}
                        >
                          {r.enabled ? 'Disable' : 'Enable'}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => deleteRule(r.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">
              No custom rules configured. Default rules (sync &gt;100 blocks behind, memory &gt;80%, CPU &gt;80%) are always active.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
})
