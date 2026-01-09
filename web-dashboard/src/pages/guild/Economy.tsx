import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ShoppingBag, Settings, Plus, Pencil, Trash2, X } from 'lucide-react'

interface ShopItem {
  id: string
  name: string
  description: string
  price: number
  type: 'item' | 'role'
  roleId?: string
  stock: number
}

interface GuildRole {
  id: string
  name: string
}

export default function Economy() {
  const { guildId } = useParams()
  const [activeTab, setActiveTab] = useState<'config' | 'shop'>('config')
  const [shopItems, setShopItems] = useState<ShopItem[]>([])
  const [roles, setRoles] = useState<GuildRole[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    type: 'item' as 'item' | 'role',
    roleId: '',
    stock: -1,
  })

  // Load shop items
  const loadShopItems = async () => {
    if (!guildId) return

    try {
      const response = await fetch(`/api/guild/${guildId}/economy/shop`, {
        credentials: 'include',
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status} ${response.statusText}: ${errorText}`)
      }

      const data = await response.json()
      setShopItems(data.items || [])
    } catch (error) {
      console.error('Failed to load shop items:', error)
    }
  }

  // Load guild roles
  const loadRoles = async () => {
    if (!guildId) return

    try {
      const response = await fetch(`/api/guild/${guildId}/info`, {
        credentials: 'include',
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status} ${response.statusText}: ${errorText}`)
      }

      const data = await response.json()
      setRoles(data.roles?.filter((r: GuildRole) => r.id !== guildId) || [])
    } catch (error) {
      console.error('Failed to load roles:', error)
    }
  }

  useEffect(() => {
    if (activeTab === 'shop') {
      loadShopItems()
      loadRoles()
    }
  }, [activeTab, guildId])

  // Handle Escape key for modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddModal) setShowAddModal(false)
        if (showEditModal) setShowEditModal(false)
      }
    }

    if (showAddModal || showEditModal) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [showAddModal, showEditModal])

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      type: 'item',
      roleId: '',
      stock: -1,
    })
  }

  const handleAddItem = async () => {
    if (!guildId) {
      alert('Missing guild ID')
      return
    }

    // Client-side validation
    const trimmedName = formData.name.trim()
    if (!trimmedName) {
      alert('Item name is required')
      return
    }

    if (formData.price < 0) {
      alert('Price must be 0 or greater')
      return
    }

    if (formData.type === 'role' && !formData.roleId) {
      alert('Please select a role for role-type items')
      return
    }

    try {
      const response = await fetch(`/api/guild/${guildId}/economy/shop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to add shop item')

      setShowAddModal(false)
      resetForm()
      loadShopItems()
    } catch (error) {
      console.error('Failed to add shop item:', error)
      alert('Failed to add shop item')
    }
  }

  const handleEditItem = async () => {
    if (!editingItem) return
    if (!guildId) {
      alert('Missing guild ID')
      return
    }

    try {
      const response = await fetch(`/api/guild/${guildId}/economy/shop/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to update shop item')

      setShowEditModal(false)
      setEditingItem(null)
      resetForm()
      loadShopItems()
    } catch (error) {
      console.error('Failed to update shop item:', error)
      alert('Failed to update shop item')
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!guildId) {
      alert('Missing guild ID')
      return
    }

    if (!confirm('Are you sure you want to delete this shop item?')) return

    try {
      const response = await fetch(`/api/guild/${guildId}/economy/shop/${itemId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to delete shop item')

      loadShopItems()
    } catch (error) {
      console.error('Failed to delete shop item:', error)
      alert('Failed to delete shop item')
    }
  }

  const openEditModal = (item: ShopItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price,
      type: item.type,
      roleId: item.roleId || '',
      stock: item.stock,
    })
    setShowEditModal(true)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Economy System</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Configure currency, rewards, and shop items
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-8 border-b border-border">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${
              activeTab === 'config'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="h-4 w-4" />
            Configuration
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shop')}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${
              activeTab === 'shop'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            Shop Items
          </button>
        </div>
      </div>

      {/* Configuration Tab */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Enable toggle */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Enable Economy</h3>
                <p className="text-sm text-muted-foreground">
                  Allow members to earn and spend virtual currency
                </p>
              </div>
              <button type="button" className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted">
                <span className="inline-block h-4 w-4 translate-x-1 transform rounded-full bg-background" />
              </button>
            </div>
          </div>

          {/* Currency settings */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Currency Settings</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="currency-name" className="mb-2 block text-sm font-medium">Currency Name</label>
                <input
                  id="currency-name"
                  type="text"
                  placeholder="Coins"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2"
                />
              </div>
              <div>
                <label htmlFor="currency-symbol" className="mb-2 block text-sm font-medium">Currency Symbol</label>
                <input
                  id="currency-symbol"
                  type="text"
                  placeholder="💰"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2"
                />
              </div>
              <div>
                <label htmlFor="starting-balance" className="mb-2 block text-sm font-medium">Starting Balance</label>
                <input
                  id="starting-balance"
                  type="number"
                  placeholder="100"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2"
                />
              </div>
            </div>
          </div>

          {/* Rewards */}
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="mb-4 text-lg font-semibold">Rewards</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="daily-reward" className="mb-2 block text-sm font-medium">Daily Reward</label>
                <input
                  id="daily-reward"
                  type="number"
                  placeholder="100"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2"
                />
                <p className="mt-1 text-xs text-muted-foreground">Amount users receive daily</p>
              </div>
              <div>
                <label htmlFor="daily-cooldown" className="mb-2 block text-sm font-medium">Daily Cooldown (hours)</label>
                <input
                  id="daily-cooldown"
                  type="number"
                  placeholder="24"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2"
                />
                <p className="mt-1 text-xs text-muted-foreground">Hours between daily claims</p>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button type="button" className="rounded-lg bg-primary px-6 py-2 font-semibold text-primary-foreground hover:bg-primary/90">
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Shop Items Tab */}
      {activeTab === 'shop' && (
        <div className="space-y-6">
          {/* Add Item Button */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Manage shop items that users can purchase with currency
            </p>
            <button
              type="button"
              onClick={() => {
                resetForm()
                setShowAddModal(true)
              }}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Item
            </button>
          </div>

          {/* Shop Items List */}
          {shopItems.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-12 text-center">
              <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No shop items yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Get started by adding your first shop item
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shopItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-border bg-card p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Price</span>
                      <span className="font-semibold">💰 {item.price}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Type</span>
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {item.type === 'role' ? 'Role' : 'Item'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Stock</span>
                      <span className="font-semibold">
                        {item.stock === -1 ? 'Unlimited' : item.stock}
                      </span>
                    </div>
                    {item.type === 'role' && item.roleId && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Role</span>
                        <span className="font-semibold">
                          {roles.find((r) => r.id === item.roleId)?.name || 'Unknown'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-item-modal-title"
            className="w-full max-w-md rounded-lg border border-border bg-card p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 id="add-item-modal-title" className="text-lg font-semibold">Add Shop Item</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-2 hover:bg-accent"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="add-item-name" className="mb-2 block text-sm font-medium">Item Name</label>
                <input
                  id="add-item-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Cool Item"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2"
                />
              </div>
              <div>
                <label htmlFor="add-item-description" className="mb-2 block text-sm font-medium">Description</label>
                <textarea
                  id="add-item-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="A cool item that does something"
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="add-item-price" className="mb-2 block text-sm font-medium">Price</label>
                  <input
                    id="add-item-price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => {
                      const num = Number(e.target.value)
                      setFormData({ ...formData, price: Number.isFinite(num) ? num : 0 })
                    }}
                    placeholder="100"
                    className="w-full rounded-lg border border-border bg-background px-4 py-2"
                  />
                </div>
                <div>
                  <label htmlFor="add-item-stock" className="mb-2 block text-sm font-medium">
                    Stock <span className="text-xs text-muted-foreground">(-1 = unlimited)</span>
                  </label>
                  <input
                    id="add-item-stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => {
                      const num = Number(e.target.value)
                      setFormData({ ...formData, stock: Number.isFinite(num) ? num : 0 })
                    }}
                    placeholder="-1"
                    className="w-full rounded-lg border border-border bg-background px-4 py-2"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="add-item-type" className="mb-2 block text-sm font-medium">Item Type</label>
                <select
                  id="add-item-type"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as 'item' | 'role' })
                  }
                  className="w-full rounded-lg border border-border bg-background px-4 py-2"
                >
                  <option value="item">Regular Item</option>
                  <option value="role">Role (Auto-assign)</option>
                </select>
              </div>
              {formData.type === 'role' && (
                <div>
                  <label htmlFor="add-item-role" className="mb-2 block text-sm font-medium">Role to Assign</label>
                  <select
                    id="add-item-role"
                    value={formData.roleId}
                    onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2"
                  >
                    <option value="">Select a role...</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg border border-border px-4 py-2 font-medium hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddItem}
                className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-item-modal-title"
            className="w-full max-w-md rounded-lg border border-border bg-card p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 id="edit-item-modal-title" className="text-lg font-semibold">Edit Shop Item</h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-lg p-2 hover:bg-accent"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="edit-item-name" className="mb-2 block text-sm font-medium">Item Name</label>
                <input
                  id="edit-item-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2"
                />
              </div>
              <div>
                <label htmlFor="edit-item-description" className="mb-2 block text-sm font-medium">Description</label>
                <textarea
                  id="edit-item-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-item-price" className="mb-2 block text-sm font-medium">Price</label>
                  <input
                    id="edit-item-price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => {
                      const num = Number(e.target.value)
                      setFormData({ ...formData, price: Number.isFinite(num) ? num : 0 })
                    }}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2"
                  />
                </div>
                <div>
                  <label htmlFor="edit-item-stock" className="mb-2 block text-sm font-medium">
                    Stock <span className="text-xs text-muted-foreground">(-1 = unlimited)</span>
                  </label>
                  <input
                    id="edit-item-stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => {
                      const num = Number(e.target.value)
                      setFormData({ ...formData, stock: Number.isFinite(num) ? num : 0 })
                    }}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="edit-item-type" className="mb-2 block text-sm font-medium">Item Type</label>
                <select
                  id="edit-item-type"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value as 'item' | 'role' })
                  }
                  className="w-full rounded-lg border border-border bg-background px-4 py-2"
                >
                  <option value="item">Regular Item</option>
                  <option value="role">Role (Auto-assign)</option>
                </select>
              </div>
              {formData.type === 'role' && (
                <div>
                  <label htmlFor="edit-item-role" className="mb-2 block text-sm font-medium">Role to Assign</label>
                  <select
                    id="edit-item-role"
                    value={formData.roleId}
                    onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2"
                  >
                    <option value="">Select a role...</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-lg border border-border px-4 py-2 font-medium hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditItem}
                className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Update Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
