import { sql } from '@/lib/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface Alert {
  type: string
  severity: string
  chain?: number
  chainName?: string
  message: string
  details?: string
  timestamp: string
}

// Send webhook notification
async function sendWebhook(webhook: any, alert: Alert): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Alert-Type': alert.type,
        'X-Alert-Severity': alert.severity,
      },
      body: JSON.stringify({
        source: 'golden-axe',
        alert: {
          type: alert.type,
          severity: alert.severity,
          chain: alert.chain,
          chainName: alert.chainName,
          message: alert.message,
          details: alert.details,
          timestamp: alert.timestamp,
        },
        webhook_name: webhook.name,
        sent_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (response.ok) {
      await sql`
        UPDATE notification_webhooks
        SET last_triggered_at = now(), last_error = NULL
        WHERE id = ${webhook.id}
      `
      return { success: true }
    } else {
      const error = `HTTP ${response.status}`
      await sql`
        UPDATE notification_webhooks
        SET last_error = ${error}
        WHERE id = ${webhook.id}
      `
      return { success: false, error }
    }
  } catch (e: any) {
    await sql`
      UPDATE notification_webhooks
      SET last_error = ${e.message}
      WHERE id = ${webhook.id}
    `
    return { success: false, error: e.message }
  }
}

// Send email notification (basic implementation - logs for now, can integrate with email service)
async function sendEmail(emailConfig: any, alert: Alert): Promise<{ success: boolean; error?: string }> {
  try {
    // For now, log the email. In production, integrate with SendGrid, Postmark, etc.
    console.log(`[EMAIL] To: ${emailConfig.email}, Subject: [${alert.severity.toUpperCase()}] ${alert.message}`)

    // Check if POSTMARK_KEY is available (from the main project)
    const postmarkKey = process.env.POSTMARK_KEY

    if (postmarkKey) {
      const response = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Server-Token': postmarkKey,
        },
        body: JSON.stringify({
          From: 'alerts@indexsupply.net',
          To: emailConfig.email,
          Subject: `[${alert.severity.toUpperCase()}] Golden Axe Alert: ${alert.message}`,
          TextBody: `
Alert Type: ${alert.type}
Severity: ${alert.severity}
${alert.chainName ? `Chain: ${alert.chainName}` : ''}
Message: ${alert.message}
${alert.details ? `Details: ${alert.details}` : ''}
Time: ${new Date(alert.timestamp).toLocaleString()}

---
Golden Axe Admin Panel
          `.trim(),
          HtmlBody: `
<h2 style="color: ${alert.severity === 'critical' ? '#dc3545' : alert.severity === 'warning' ? '#ffc107' : '#17a2b8'}">
  [${alert.severity.toUpperCase()}] ${alert.message}
</h2>
<table style="border-collapse: collapse; margin: 20px 0;">
  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Type:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${alert.type}</td></tr>
  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Severity:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${alert.severity}</td></tr>
  ${alert.chainName ? `<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Chain:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${alert.chainName}</td></tr>` : ''}
  ${alert.details ? `<tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Details:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${alert.details}</td></tr>` : ''}
  <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Time:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${new Date(alert.timestamp).toLocaleString()}</td></tr>
</table>
<p style="color: #666; font-size: 12px;">Golden Axe Admin Panel</p>
          `.trim(),
        }),
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        await sql`
          UPDATE notification_emails SET last_sent_at = now() WHERE id = ${emailConfig.id}
        `
        return { success: true }
      } else {
        return { success: false, error: `Postmark error: ${response.status}` }
      }
    }

    // If no email service configured, just mark as sent (for testing)
    await sql`
      UPDATE notification_emails SET last_sent_at = now() WHERE id = ${emailConfig.id}
    `
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// Main endpoint to send notifications for an alert
export async function POST(req: Request) {
  try {
    const alert: Alert = await req.json()

    // Get enabled webhooks that subscribe to this event type
    const webhooks = await sql`
      SELECT id, name, url, events
      FROM notification_webhooks
      WHERE enabled = true
      AND (events = '{}' OR ${alert.type} = ANY(events))
    `

    // Get enabled emails that subscribe to this event type
    const emails = await sql`
      SELECT id, name, email, events
      FROM notification_emails
      WHERE enabled = true
      AND (events = '{}' OR ${alert.type} = ANY(events))
    `

    const results = {
      webhooks: [] as { name: string; success: boolean; error?: string }[],
      emails: [] as { name: string; success: boolean; error?: string }[],
    }

    // Send webhooks
    for (const webhook of webhooks) {
      const result = await sendWebhook(webhook, alert)
      results.webhooks.push({ name: webhook.name, ...result })
    }

    // Send emails
    for (const email of emails) {
      const result = await sendEmail(email, alert)
      results.emails.push({ name: email.name, ...result })
    }

    return NextResponse.json({
      success: true,
      sent: {
        webhooks: results.webhooks.filter(r => r.success).length,
        emails: results.emails.filter(r => r.success).length,
      },
      results,
    })
  } catch (e: any) {
    console.error('Error sending notifications:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
