import * as XLSX from 'xlsx'

export function exportToExcel(expenses, filename = 'spending') {

  // Build rows
  const rows = expenses.map(e => ({
    Date: e.date || '',
    Category: e.category || '',
    'Amount (RM)': Number(e.amount || 0).toFixed(2),
    Note: e.note || '',
    Receipt: e.receiptImage ? 'See image column' : 'No receipt'
  }))

  // Create workbook
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)

  // Set column widths
  ws['!cols'] = [
    { wch: 14 }, // Date
    { wch: 14 }, // Category
    { wch: 14 }, // Amount
    { wch: 30 }, // Note
    { wch: 20 }, // Receipt
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Expenses')

  // Download
  XLSX.writeFile(wb, `${filename}.xlsx`)
}