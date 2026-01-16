'use client'

import { useState, FormEvent } from 'react'
import { useAdmin } from '@/components/AdminContext'
import { Network } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface NetworkFormState {
  chain: string
  name: string
  url: string
  enabled: boolean
  batch_size: string
  concurrency: string
  start_block: string
}

const initialFormState: NetworkFormState = {
  chain: '',
  name: '',
  url: '',
  enabled: false,
  batch_size: '2000',
  concurrency: '10',
  start_block: '',
}

interface NetworksTabProps {
  networks: Network[]
  setNetworks: (networks: Network[]) => void
  filteredNetworks: Network[]
  onRefresh: () => void
}

export function NetworksTab({
  networks,
  setNetworks,
  filteredNetworks,
  onRefresh,
}: NetworksTabProps) {
  const { colors, styles, darkMode } = useAdmin()
  const [form, setForm] = useState<NetworkFormState>(initialFormState)

  async function addNetwork(e: FormEvent) {
    e.preventDefault()
    await fetch('/api/networks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chain: parseInt(form.chain),
        name: form.name,
        url: form.url,
        enabled: form.enabled,
        batch_size: parseInt(form.batch_size) || 2000,
        concurrency: parseInt(form.concurrency) || 10,
        start_block: form.start_block ? parseInt(form.start_block) : null,
      }),
    })
    setForm(initialFormState)
    onRefresh()
  }

  async function updateNetwork(network: Network, updates: Partial<Network>) {
    await fetch('/api/networks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...network, ...updates }),
    })
    onRefresh()
  }

  async function toggleNetwork(network: Network) {
    await updateNetwork(network, { enabled: !network.enabled })
  }

  async function deleteNetwork(chain: number) {
    if (!confirm('Delete this network?')) return
    await fetch('/api/networks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chain }),
    })
    onRefresh()
  }

  return (
    <>
      <Card colors={colors} darkMode={darkMode} title="Add Network">
        <form onSubmit={addNetwork}>
          <input
            style={styles.input}
            placeholder="Chain ID"
            value={form.chain}
            onChange={(e) => setForm({ ...form, chain: e.target.value })}
            required
          />
          <input
            style={styles.input}
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            style={{ ...styles.input, width: '300px' }}
            placeholder="RPC URL"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            required
          />
          <input
            style={styles.input}
            placeholder="Batch Size"
            value={form.batch_size}
            onChange={(e) => setForm({ ...form, batch_size: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="Concurrency"
            value={form.concurrency}
            onChange={(e) => setForm({ ...form, concurrency: e.target.value })}
          />
          <input
            style={styles.input}
            placeholder="Start Block"
            value={form.start_block}
            onChange={(e) => setForm({ ...form, start_block: e.target.value })}
          />
          <label style={{ marginRight: '10px' }}>
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            />{' '}
            Enabled
          </label>
          <Button type="submit">Add Network</Button>
        </form>
      </Card>

      <Card colors={colors} darkMode={darkMode} title="Networks">
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Chain</th>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>URL</th>
              <th style={styles.th}>Batch</th>
              <th style={styles.th}>Concurrency</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredNetworks.map((n) => (
              <tr key={n.chain}>
                <td style={styles.td}>{n.chain}</td>
                <td style={styles.td}>{n.name}</td>
                <td style={styles.td}>
                  <input
                    type="text"
                    style={{ ...styles.inlineInput, width: '200px', textAlign: 'left' }}
                    value={n.url}
                    onChange={(e) => {
                      const newVal = e.target.value
                      setNetworks(
                        networks.map((net) =>
                          net.chain === n.chain ? { ...net, url: newVal } : net
                        )
                      )
                    }}
                    onBlur={(e) => updateNetwork(n, { url: e.target.value })}
                    title={n.url}
                  />
                </td>
                <td style={styles.td}>
                  <input
                    type="number"
                    style={styles.inlineInput}
                    value={n.batch_size}
                    onChange={(e) => {
                      const newVal = parseInt(e.target.value) || 10
                      setNetworks(
                        networks.map((net) =>
                          net.chain === n.chain ? { ...net, batch_size: newVal } : net
                        )
                      )
                    }}
                    onBlur={(e) =>
                      updateNetwork(n, { batch_size: parseInt(e.target.value) || 10 })
                    }
                  />
                </td>
                <td style={styles.td}>
                  <input
                    type="number"
                    style={styles.inlineInput}
                    value={n.concurrency}
                    onChange={(e) => {
                      const newVal = parseInt(e.target.value) || 1
                      setNetworks(
                        networks.map((net) =>
                          net.chain === n.chain ? { ...net, concurrency: newVal } : net
                        )
                      )
                    }}
                    onBlur={(e) =>
                      updateNetwork(n, { concurrency: parseInt(e.target.value) || 1 })
                    }
                  />
                </td>
                <td style={styles.td}>
                  <Button
                    variant={n.enabled ? 'success' : 'secondary'}
                    size="sm"
                    onClick={() => toggleNetwork(n)}
                  >
                    {n.enabled ? 'Enabled' : 'Disabled'}
                  </Button>
                </td>
                <td style={styles.td}>
                  <Button variant="danger" size="sm" onClick={() => deleteNetwork(n.chain)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  )
}
