import { useState } from 'react'
import { doc, deleteDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { CATEGORIES, CATEGORY_ICONS } from '../constants/categories'
import { useExpenses } from '../hooks/useExpenses'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { exportToExcel } from '../utils/exportExcel'

function History() {
  const { expenses, loading } = useExpenses()

  const [filterCat, setFilterCat] = useState('All')
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7))
  const [viewReceipt, setViewReceipt] = useState(null)

  // Edit state
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editDate, setEditDate] = useState(new Date())
  const [saveLoading, setSaveLoading] = useState(false)

  // ── 1. FILTERED DATA DEFINED AT THE TOP ──
  const filtered = expenses
    .filter(e => !filterMonth || e.date?.startsWith(filterMonth))
    .filter(e => filterCat === 'All' || e.category === filterCat)
    .sort((a, b) => b.date?.localeCompare(a.date))

  // ── EXPORT EXCEL HANDLER SCOPE (Reads 'filtered' cleanly now) ──
  const handleExportExcel = () => {
    exportToExcel(filtered, `spending-${filterMonth || 'all'}`)
  }

  // ── DELETE ──
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return
    try {
      await deleteDoc(doc(db, 'expenses', id))
    } catch (error) {
      alert('Failed to delete.')
    }
  }

  // ── OPEN EDIT ──
  const handleEditOpen = (e) => {
    setEditingId(e.id)
    setEditForm({
      amount: e.amount,
      category: e.category,
      note: e.note || ''
    })
    setEditDate(e.date ? new Date(e.date + 'T00:00:00') : new Date())
  }

  // ── CANCEL EDIT ──
  const handleEditCancel = () => {
    setEditingId(null)
    setEditForm({})
  }

  // ── SAVE EDIT ──
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
        date: editDate.toISOString().slice(0, 10)
      })
      setEditingId(null)
    } catch (error) {
      console.error(error)
      alert('Failed to save changes.')
    }
    setSaveLoading(false)
  }

  // ── EXPORT CSV with receipt image ──
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
  }

  // ── EXPORT RECEIPTS as individual images ──
  const exportReceipts = () => {
    const withReceipts = filtered.filter(e => e.receiptImage)
    if (withReceipts.length === 0) {
      alert('No receipts found for this period.')
      return
    }
    withReceipts.forEach((e, i) => {
      setTimeout(() => {
        const a = document.createElement('a')
        a.href = e.receiptImage
        a.download = `receipt-${e.date}-${e.category}-RM${e.amount}.jpg`
        a.click()
      }, i * 500)
    })
  }

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    return d.toISOString().slice(0, 7)
  })

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div className="page-container">
      <h2 className="page-title">📜 History</h2>

      {/* FILTERS */}
      <div className="filter-row">
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          <option value="">All months</option>
          {months.map(m => (
            <option key={m} value={m}>
              {new Date(m + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}
            </option>
          ))}
        </select>

        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="All">📂 All</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {cat}</option>
          ))}
        </select>

        <button className="export-btn" onClick={exportCSV}>⬇ CSV</button>
        <button className="export-btn" onClick={handleExportExcel}>📊 Excel</button>
        <button className="export-btn" onClick={exportReceipts}>🧾 Receipts</button>
      </div>

      {/* LIST */}
      <div className="form-card">
        {filtered.length === 0 ? (
          <div className="empty">No expenses found.</div>
        ) : filtered.map(e => (
          <div key={e.id}>

            {/* NORMAL VIEW */}
            {editingId !== e.id ? (
              <div className="expense-item">
                <div className="expense-main">

                  <div className="expense-info">
                    <div className="expense-header-row">
                      <div className="expense-name">
                        {CATEGORY_ICONS[e.category]} {e.note || e.category}
                      </div>
                    </div>
                    <div className="expense-meta">
                      {e.category} · {e.date}
                    </div>
                    <div className="expense-amount-bottom">
                      RM {Number(e.amount || 0).toFixed(2)}
                    </div>

                    {/* RECEIPT THUMBNAIL */}
                    {e.receiptImage && (
                      <div
                        className="receipt-thumb-wrap"
                        onClick={() => setViewReceipt(e.receiptImage)}
                      >
                        <img
                          src={e.receiptImage}
                          alt="Receipt"
                          className="receipt-thumb"
                        />
                        <span className="receipt-thumb-label">🧾 View Receipt</span>
                      </div>
                    )}
                  </div>

                  <div className="expense-actions">
                    <button className="edit-btn" onClick={() => handleEditOpen(e)}>✏️</button>
                    <button className="delete-btn" onClick={() => handleDelete(e.id)}>🗑</button>
                  </div>

                </div>
              </div>

            ) : (

              /* EDIT VIEW */
              <div className="edit-form">
                <div className="edit-title">✏️ Edit Expense</div>

                <div className="edit-row">
                  <label>Amount (RM)</label>
                  <input
                    type="number"
                    value={editForm.amount}
                    onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                    step="0.01"
                  />
                </div>

                <div className="edit-row">
                  <label>Note</label>
                  <input
                    type="text"
                    value={editForm.note}
                    onChange={e => setEditForm({ ...editForm, note: e.target.value })}
                    placeholder="e.g. lunch at mamak"
                  />
                </div>

                <div className="edit-row">
                  <label>Category</label>
                  <select
                    value={editForm.category}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {cat}</option>
                    ))}
                  </select>
                </div>

                <div className="edit-row">
                  <label>Date</label>
                  <DatePicker
                    selected={editDate}
                    onChange={setEditDate}
                    maxDate={new Date()}
                    dateFormat="dd/MM/yyyy"
                    className="datepicker-input"
                  />
                </div>

                <div className="edit-actions">
                  <button className="btn-cancel" onClick={handleEditCancel}>Cancel</button>
                  <button className="btn-save" onClick={handleEditSave} disabled={saveLoading}>
                    {saveLoading ? 'Saving...' : '✅ Save'}
                  </button>
                </div>
              </div>
            )}

          </div>
        ))}
      </div>

      {/* RECEIPT MODAL */}
      {viewReceipt && (
        <div className="receipt-modal-overlay" onClick={() => setViewReceipt(null)}>
          <div className="receipt-modal-box" onClick={e => e.stopPropagation()}>
            <div className="receipt-modal-header">
              <span>🧾 Receipt</span>
              <button className="receipt-modal-close" onClick={() => setViewReceipt(null)}>✕</button>
            </div>
            <img src={viewReceipt} alt="Receipt" className="receipt-modal-img" />
            <a href={viewReceipt} download="receipt.jpg" className="receipt-download-btn">
              ⬇ Download Receipt
            </a>
          </div>
        </div>
      )}

    </div>
  )
}

export default History