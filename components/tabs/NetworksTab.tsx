'use client'

import { useState, FormEvent, memo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Network } from '@/types'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'

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

export const NetworksTab = memo(function NetworksTab({
  networks,
  setNetworks,
  filteredNetworks,
  onRefresh,
}: NetworksTabProps) {
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Network</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addNetwork} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="chain">Chain ID</Label>
              <Input
                id="chain"
                name="chain"
                className="w-24"
                placeholder="e.g. 1"
                value={form.chain}
                onChange={(e) => setForm({ ...form, chain: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                className="w-32"
                placeholder="e.g. Ethereum"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label htmlFor="url">RPC URL</Label>
              <Input
                id="url"
                name="url"
                placeholder="https://…"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="batch">Batch Size</Label>
              <Input
                id="batch"
                name="batch_size"
                className="w-24"
                placeholder="2000"
                value={form.batch_size}
                onChange={(e) => setForm({ ...form, batch_size: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="concurrency">Concurrency</Label>
              <Input
                id="concurrency"
                name="concurrency"
                className="w-24"
                placeholder="10"
                value={form.concurrency}
                onChange={(e) => setForm({ ...form, concurrency: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="start">Start Block</Label>
              <Input
                id="start"
                name="start_block"
                className="w-28"
                placeholder="0"
                value={form.start_block}
                onChange={(e) => setForm({ ...form, start_block: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 pb-1">
              <input
                type="checkbox"
                id="enabled"
                className="h-4 w-4 rounded border-border"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              />
              <Label htmlFor="enabled" className="text-sm">Enabled</Label>
            </div>
            <Button type="submit" variant="gold">
              <Plus className="h-4 w-4" />
              Add Network
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Networks</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chain</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Concurrency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNetworks.map((n) => (
                <TableRow key={n.chain}>
                  <TableCell className="font-mono">{n.chain}</TableCell>
                  <TableCell className="font-medium">{n.name}</TableCell>
                  <TableCell>
                    <Input
                      className="w-48 h-8 text-xs font-mono"
                      value={n.url ?? ''}
                      onChange={(e) => {
                        const newVal = e.target.value
                        setNetworks(
                          networks.map((net) =>
                            net.chain === n.chain ? { ...net, url: newVal } : net
                          )
                        )
                      }}
                      onBlur={(e) => updateNetwork(n, { url: e.target.value })}
                      title={n.url ?? ''}
                      aria-label={`RPC URL for ${n.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-20 h-8 text-center"
                      value={n.batch_size ?? ''}
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
                      aria-label={`Batch size for ${n.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className="w-16 h-8 text-center"
                      value={n.concurrency ?? ''}
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
                      aria-label={`Concurrency for ${n.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant={n.enabled ? 'success' : 'secondary'}
                      size="sm"
                      onClick={() => toggleNetwork(n)}
                    >
                      {n.enabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button variant="danger" size="sm" onClick={() => deleteNetwork(n.chain)} aria-label={`Delete ${n.name} network`}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredNetworks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No networks found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
})
