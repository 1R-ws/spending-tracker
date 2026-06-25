import { useState } from 'react'
import { doc, deleteDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { CATEGORIES, COLORS, CATEGORY_ICONS } from '../constants/categories'
import { useExpenses } from '../hooks/useExpenses'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { exportToExcel } from '../utils/exportExcel'
import '../styles/history.css'

function History() {
  const { expenses, loading } = useExpenses()

  const [filterCat, setFilterCat] = useState('All')
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7))
  const [viewReceipt, setViewReceipt] = useState(null)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editDate, setEditDate] = useState(new Date())
  const [saveLoading, setSaveLoading] = useState(false)

  const filtered = expenses
    .filter(e => !filterMonth || e.date?.startsWith(filterMonth))
    .filter(e => filterCat === 'All' || e.category === filterCat)
    .sort((a, b) => b.date?.localeCompare(a.date))

  const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount || 0), 0)

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return d.toISOString().slice(0, 7)
  })

  // ── EXPORT ──
  const handleExportExcel = () => {
    exportToExcel(filtered, `spending-${filterMonth || 'all'}`)
    setShowExportMenu(false)
  }

  const exportCSV = () => {
    const headers = ['Date', 'Category', 'Amount (RM)', 'Note', 'Receipt Image (URL)']
    const rows = filtered.map(e => [
      e.date,
      e.category,
      e.amount,
      `"${(e.note || '').replace(/"/g, '""')}"`,
      e.receiptImage ? `"${e.receiptImage}"` : ''
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `spending-${filterMonth || 'all'}.csv`
    a.click()
    setShowExportMenu(false)
  }

  const [showReceiptGallery, setShowReceiptGallery] = useState(false)

  const exportReceipts = () => {
    const withReceipts = filtered.filter(e => e.receiptImage)
    if (withReceipts.length === 0) {
      alert('No receipts found for this period.')
      setShowExportMenu(false)
      return
    }
    setShowReceiptGallery(true)
    setShowExportMenu(false)
  }

    // ── DELETE ──
    const handleDelete = async (id) => {
      if (!window.confirm('Delete this expense?')) return
      try {
        await deleteDoc(doc(db, 'expenses', id))
      } catch {
        alert('Failed to delete.')
      }
    }

  // ── EDIT ──
  const handleEditOpen = (e) => {
    setEditingId(e.id)
    setEditForm({ amount: e.amount, category: e.category, note: e.note || '' })
    setEditDate(e.date ? new Date(e.date + 'T00:00:00') : new Date())
  }

  const handleEditCancel = () => {
    setEditingId(null)
    setEditForm({})
  }

  const handleEditSave = async () => {
    if (!editForm.amount || Number(editForm.amount) <= 0) {
      alert('Please enter a valid amount.')
      return
    }
    setSaveLoading(true)
    try {
      await updateDoc(doc(db, 'expenses', editingId), {
        amount: parseFloat(editForm.amount),
        category: editForm.category,
        note: editForm.note,
        date: `${editDate.getFullYear()}-${String(editDate.getMonth() + 1).padStart(2, '0')}-${String(editDate.getDate()).padStart(2, '0')}`
      })
      setEditingId(null)
    } catch {
      alert('Failed to save changes.')
    }
    setSaveLoading(false)
  }

  if (loading) return <div className="hy-loading">Loading…</div>

  return (
    <div className="hy-root">

      {/* HEADER */}
      <div className="hy-header">
        <span className="hy-title">History</span>
        <div className="hy-header-right">
          <div className="hy-export-wrap">
            <button
              className="hy-export-btn"
              onClick={() => setShowExportMenu(prev => !prev)}
            >
              ↓ Export
            </button>
            {showExportMenu && (
              <>
                <div className="hy-export-backdrop" onClick={() => setShowExportMenu(false)} />
                <div className="hy-export-menu">
                  <button className="hy-export-item" onClick={exportCSV}>📄 CSV</button>
                  <button className="hy-export-item" onClick={handleExportExcel}>📊 Excel</button>
                  <button className="hy-export-item" onClick={exportReceipts}>🧾 Receipts</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="hy-filters">
        <select
          className="hy-select"
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
        >
          <option value="">All months</option>
          {months.map(m => (
            <option key={m} value={m}>
              {new Date(m + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
            </option>
          ))}
        </select>

        <select
          className="hy-select"
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
        >
          <option value="All">All categories</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {cat}</option>
          ))}
        </select>
      </div>

      {/* SUMMARY BAR */}
      {filtered.length > 0 && (
        <div className="hy-summary">
          <span className="hy-summary-count">{filtered.length} transactions</span>
          <span className="hy-summary-total">RM {totalFiltered.toFixed(2)}</span>
        </div>
      )}

      {/* LIST */}
      <div className="hy-list">
        {filtered.length === 0 ? (
          <div className="hy-empty">No expenses found.</div>
        ) : filtered.map(e => (
          <div key={e.id}>

            {/* NORMAL VIEW */}
            {editingId !== e.id ? (
              <div className="hy-item">
                <div
                  className="hy-item-icon"
                  style={{ background: (COLORS[e.category] || '#9ca3af') + '22' }}
                >
                  {CATEGORY_ICONS[e.category] || '📦'}
                </div>

                <div className="hy-item-info">
                  <div className="hy-item-name">{e.note || e.category}</div>
                  <div className="hy-item-meta">{e.category} · {e.date}</div>
                  {e.receiptImage && (
                    <button
                      className="hy-receipt-link"
                      onClick={() => setViewReceipt(e.receiptImage)}
                    >
                      🧾 View receipt
                    </button>
                  )}
                </div>

                <div className="hy-item-right">
                  <div className="hy-item-amt">- RM {Number(e.amount || 0).toFixed(2)}</div>
                  <div className="hy-item-actions">
                    <button
                      className="hy-act-btn"
                      onClick={() => handleEditOpen(e)}
                      aria-label="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      className="hy-act-btn del"
                      onClick={() => handleDelete(e.id)}
                      aria-label="Delete"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>

            ) : (

              /* EDIT VIEW */
              <div className="hy-edit-card">
                <div className="hy-edit-title">✏️ Edit expense</div>

                <div className="hy-edit-field">
                  <label>Amount (RM)</label>
                  <div className="hy-edit-amount-row">
                    <span className="hy-edit-prefix">RM</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={editForm.amount}
                      onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="hy-edit-field">
                  <label>Note</label>
                  <input
                    type="text"
                    value={editForm.note}
                    onChange={e => setEditForm({ ...editForm, note: e.target.value })}
                    placeholder="e.g. lunch at mamak"
                  />
                </div>

                <div className="hy-edit-field">
                  <label>Category</label>
                  <div className="hy-edit-chips">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        className={`hy-edit-chip${editForm.category === cat ? ' active' : ''}`}
                        onClick={() => setEditForm({ ...editForm, category: cat })}
                      >
                        {CATEGORY_ICONS[cat]} {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="hy-edit-field">
                  <label>Date</label>
                  <div className="hy-edit-date-wrap">
                    <span>📅</span>
                    <DatePicker
                      selected={editDate}
                      onChange={setEditDate}
                      maxDate={new Date()}
                      dateFormat="dd MMMM yyyy"
                      className="hy-edit-datepicker"
                    />
                  </div>
                </div>

                <div className="hy-edit-actions">
                  <button className="hy-cancel-btn" onClick={handleEditCancel}>Cancel</button>
                  <button
                    className="hy-save-btn"
                    onClick={handleEditSave}
                    disabled={saveLoading}
                  >
                    {saveLoading ? 'Saving…' : '✅ Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* RECEIPT MODAL */}
      {viewReceipt && (
        <div className="hy-modal-overlay" onClick={() => setViewReceipt(null)}>
          <div className="hy-modal-box" onClick={e => e.stopPropagation()}>
            <div className="hy-modal-header">
              <span>🧾 Receipt</span>
              <button className="hy-modal-close" onClick={() => setViewReceipt(null)}>✕</button>
            </div>
            <img src={viewReceipt} alt="Receipt" className="hy-modal-img" />
            <a href={viewReceipt} download="receipt.jpg" className="hy-modal-download">
              ↓ Download receipt
            </a>
          </div>
        </div>
      )}

  {/* RECEIPT GALLERY */}
  {showReceiptGallery && (
    <div className="hy-modal-overlay" onClick={() => setShowReceiptGallery(false)}>
      <div className="hy-modal-box" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto', width: '92vw', maxWidth: 480 }}>
        <div className="hy-modal-header">
          <span>🧾 All Receipts ({filtered.filter(e => e.receiptImage).length})</span>
          <button className="hy-modal-close" onClick={() => setShowReceiptGallery(false)}>✕</button>
        </div>
        {filtered.filter(e => e.receiptImage).map(e => (
          <div key={e.id} style={{ marginBottom: 16, borderBottom: '1px solid #eee', paddingBottom: 12 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
              {e.date} · {e.category} · RM {Number(e.amount).toFixed(2)}
            </div>
            <img
              src={e.receiptImage}
              alt="Receipt"
              style={{ width: '100%', borderRadius: 8, cursor: 'pointer' }}
              onClick={() => { setViewReceipt(e.receiptImage); setShowReceiptGallery(false) }}
            />
          </div>
        ))}
      </div>
    </div>
  )}
    </div>
  )
}

export default History
