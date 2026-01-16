'use client'

import { FormEvent } from 'react'
import { useAdmin } from '@/components/AdminContext'
import { NotificationSettings, WebhookFormState, EmailFormState, RuleFormState } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

interface NotificationsTabProps {
  notificationSettings: NotificationSettings | null
  webhookForm: WebhookFormState
  setWebhookForm: (form: WebhookFormState) => void
  emailForm: EmailFormState
  setEmailForm: (form: EmailFormState) => void
  ruleForm: RuleFormState
  setRuleForm: (form: RuleFormState) => void
  addWebhook: (e: FormEvent) => void
  testWebhook: (url: string) => void
  toggleWebhook: (id: number, enabled: boolean) => void
  deleteWebhook: (id: number) => void
  addEmail: (e: FormEvent) => void
  toggleEmail: (id: number, enabled: boolean) => void
  deleteEmail: (id: number) => void
  addRule: (e: FormEvent) => void
  toggleRule: (id: number, enabled: boolean) => void
  deleteRule: (id: number) => void
}

export function NotificationsTab({
  notificationSettings,
  webhookForm,
  setWebhookForm,
  emailForm,
  setEmailForm,
  ruleForm,
  setRuleForm,
  addWebhook,
  testWebhook,
  toggleWebhook,
  deleteWebhook,
  addEmail,
  toggleEmail,
  deleteEmail,
  addRule,
  toggleRule,
  deleteRule,
}: NotificationsTabProps) {
  const { colors, styles } = useAdmin()

  return (
    <>
      {/* Webhooks */}
      <Card colors={colors} darkMode={false}>
        <h3>Webhook Notifications</h3>
        <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '15px' }}>
          Send HTTP POST requests to URLs when alerts are triggered.
        </p>

        <form onSubmit={addWebhook} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <input
            style={{ ...styles.input, flex: '1', minWidth: '150px', marginBottom: 0 }}
            type="text"
            name="webhookName"
            autoComplete="off"
            placeholder="Name (e.g., Slack)"
            value={webhookForm.name}
            onChange={e => setWebhookForm({ ...webhookForm, name: e.target.value })}
            required
          />
          <input
            style={{ ...styles.input, flex: '2', minWidth: '250px', marginBottom: 0 }}
            type="url"
            name="webhookUrl"
            autoComplete="off"
            placeholder="URL (e.g., https://hooks.slack.com/...)"
            value={webhookForm.url}
            onChange={e => setWebhookForm({ ...webhookForm, url: e.target.value })}
            required
          />
          <Button type="submit">Add Webhook</Button>
        </form>

        {notificationSettings?.webhooks && notificationSettings.webhooks.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>URL</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Last Triggered</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {notificationSettings.webhooks.map(w => (
                <tr key={w.id} style={{ opacity: w.enabled ? 1 : 0.5 }}>
                  <td style={styles.td}>{w.name}</td>
                  <td style={styles.td}>
                    <code style={{ fontSize: '11px' }}>{w.url.substring(0, 40)}...</code>
                  </td>
                  <td style={styles.td}>
                    {w.last_error ? (
                      <Badge variant="danger" title={w.last_error}>Error</Badge>
                    ) : (
                      <Badge variant={w.enabled ? 'success' : 'secondary'}>
                        {w.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    )}
                  </td>
                  <td style={styles.td}>
                    {w.last_triggered_at ? new Date(w.last_triggered_at).toLocaleString() : 'Never'}
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <Button size="sm" onClick={() => testWebhook(w.url)}>Test</Button>
                      <Button
                        size="sm"
                        variant={w.enabled ? 'secondary' : 'success'}
                        onClick={() => toggleWebhook(w.id, !w.enabled)}
                      >
                        {w.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => deleteWebhook(w.id)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: colors.textMuted }}>No webhooks configured</p>
        )}
      </Card>

      {/* Email Notifications */}
      <Card colors={colors} darkMode={false}>
        <h3>Email Notifications</h3>
        <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '15px' }}>
          Send email alerts when issues are detected. (Requires POSTMARK_KEY env var)
        </p>

        <form onSubmit={addEmail} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <input
            style={{ ...styles.input, flex: '1', minWidth: '150px', marginBottom: 0 }}
            type="text"
            name="emailName"
            autoComplete="off"
            placeholder="Name (e.g., On-call)"
            value={emailForm.name}
            onChange={e => setEmailForm({ ...emailForm, name: e.target.value })}
            required
          />
          <input
            style={{ ...styles.input, flex: '2', minWidth: '250px', marginBottom: 0 }}
            type="email"
            name="emailAddress"
            autoComplete="email"
            placeholder="Email address"
            value={emailForm.email}
            onChange={e => setEmailForm({ ...emailForm, email: e.target.value })}
            required
          />
          <Button type="submit">Add Email</Button>
        </form>

        {notificationSettings?.emails && notificationSettings.emails.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Last Sent</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {notificationSettings.emails.map(e => (
                <tr key={e.id} style={{ opacity: e.enabled ? 1 : 0.5 }}>
                  <td style={styles.td}>{e.name}</td>
                  <td style={styles.td}>{e.email}</td>
                  <td style={styles.td}>
                    <Badge variant={e.enabled ? 'success' : 'secondary'}>
                      {e.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </td>
                  <td style={styles.td}>
                    {e.last_sent_at ? new Date(e.last_sent_at).toLocaleString() : 'Never'}
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <Button
                        size="sm"
                        variant={e.enabled ? 'secondary' : 'success'}
                        onClick={() => toggleEmail(e.id, !e.enabled)}
                      >
                        {e.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => deleteEmail(e.id)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: colors.textMuted }}>No email notifications configured</p>
        )}
      </Card>

      {/* Custom Alert Rules */}
      <Card colors={colors} darkMode={false}>
        <h3>Custom Alert Rules</h3>
        <p style={{ color: colors.textMuted, fontSize: '13px', marginBottom: '15px' }}>
          Define custom thresholds for triggering alerts.
        </p>

        <form onSubmit={addRule} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'flex-end' }}>
          <div style={{ flex: '1', minWidth: '150px' }}>
            <label style={{ fontSize: '11px', color: colors.textMuted }}>Name</label>
            <input
              style={{ ...styles.input, marginBottom: 0 }}
              type="text"
              name="ruleName"
              autoComplete="off"
              placeholder="e.g., High latency alert"
              value={ruleForm.name}
              onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })}
              required
            />
          </div>
          <div style={{ minWidth: '130px' }}>
            <label style={{ fontSize: '11px', color: colors.textMuted }}>Metric</label>
            <select
              style={{ ...styles.input, marginBottom: 0 }}
              name="ruleType"
              value={ruleForm.type}
              onChange={e => setRuleForm({ ...ruleForm, type: e.target.value })}
            >
              {notificationSettings?.ruleTypes?.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              )) || (
                <>
                  <option value="sync_behind">Blocks Behind</option>
                  <option value="cpu_usage">CPU Usage</option>
                  <option value="memory_usage">Memory Usage</option>
                  <option value="rpc_latency">RPC Latency</option>
                </>
              )}
            </select>
          </div>
          {(ruleForm.type === 'sync_behind' || ruleForm.type === 'rpc_latency') && (
            <div style={{ minWidth: '100px' }}>
              <label style={{ fontSize: '11px', color: colors.textMuted }}>Chain ID</label>
              <input
                style={{ ...styles.input, marginBottom: 0 }}
                type="text"
                name="ruleChain"
                autoComplete="off"
                placeholder="e.g., 1"
                value={ruleForm.chain}
                onChange={e => setRuleForm({ ...ruleForm, chain: e.target.value })}
              />
            </div>
          )}
          <div style={{ minWidth: '80px' }}>
            <label style={{ fontSize: '11px', color: colors.textMuted }}>Comparison</label>
            <select
              style={{ ...styles.input, marginBottom: 0 }}
              name="ruleComparison"
              value={ruleForm.comparison}
              onChange={e => setRuleForm({ ...ruleForm, comparison: e.target.value })}
            >
              <option value="gt">&gt;</option>
              <option value="gte">&gt;=</option>
              <option value="lt">&lt;</option>
              <option value="lte">&lt;=</option>
              <option value="eq">=</option>
            </select>
          </div>
          <div style={{ minWidth: '100px' }}>
            <label style={{ fontSize: '11px', color: colors.textMuted }}>Threshold</label>
            <input
              style={{ ...styles.input, marginBottom: 0 }}
              type="number"
              name="ruleThreshold"
              autoComplete="off"
              placeholder="e.g., 1000"
              value={ruleForm.threshold}
              onChange={e => setRuleForm({ ...ruleForm, threshold: e.target.value })}
              required
            />
          </div>
          <div style={{ minWidth: '100px' }}>
            <label style={{ fontSize: '11px', color: colors.textMuted }}>Severity</label>
            <select
              style={{ ...styles.input, marginBottom: 0 }}
              name="ruleSeverity"
              value={ruleForm.severity}
              onChange={e => setRuleForm({ ...ruleForm, severity: e.target.value })}
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <Button type="submit">Add Rule</Button>
        </form>

        {notificationSettings?.rules && notificationSettings.rules.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Condition</th>
                <th style={styles.th}>Severity</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Last Triggered</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {notificationSettings.rules.map(r => (
                <tr key={r.id} style={{ opacity: r.enabled ? 1 : 0.5 }}>
                  <td style={styles.td}>{r.name}</td>
                  <td style={styles.td}>
                    <code>
                      {r.type}
                      {r.chain && ` (chain ${r.chain})`}
                      {' '}{r.comparison === 'gt' ? '>' : r.comparison === 'gte' ? '>=' : r.comparison === 'lt' ? '<' : r.comparison === 'lte' ? '<=' : '='}{' '}
                      {r.threshold}
                    </code>
                  </td>
                  <td style={styles.td}>
                    <Badge
                      color={r.severity === 'critical' ? '#dc3545' : r.severity === 'warning' ? '#ffc107' : '#17a2b8'}
                      style={{ color: r.severity === 'warning' ? '#000' : '#fff' }}
                    >
                      {r.severity}
                    </Badge>
                  </td>
                  <td style={styles.td}>
                    <Badge variant={r.enabled ? 'success' : 'secondary'}>
                      {r.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </td>
                  <td style={styles.td}>
                    {r.last_triggered_at ? new Date(r.last_triggered_at).toLocaleString() : 'Never'}
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <Button
                        size="sm"
                        variant={r.enabled ? 'secondary' : 'success'}
                        onClick={() => toggleRule(r.id, !r.enabled)}
                      >
                        {r.enabled ? 'Disable' : 'Enable'}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => deleteRule(r.id)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: colors.textMuted }}>No custom rules configured. Default rules (sync &gt;100 blocks behind, memory &gt;80%, CPU &gt;80%) are always active.</p>
        )}
      </Card>
    </>
  )
}
