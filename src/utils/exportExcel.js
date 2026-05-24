import ExcelJS from 'exceljs'

export async function exportToExcel(expenses, filename = 'spending') {

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Expenses')

  // Header row
  sheet.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Category', key: 'category', width: 14 },
    { header: 'Amount (RM)', key: 'amount', width: 14 },
    { header: 'Note', key: 'note', width: 30 },
    { header: 'Receipt', key: 'receipt', width: 20 },
  ]

  // Style header row
  sheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF222222' }
    }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  sheet.getRow(1).height = 30

  // Data rows
  for (let i = 0; i < expenses.length; i++) {
    const e = expenses[i]
    const rowIndex = i + 2

    sheet.addRow({
      date: e.date || '',
      category: e.category || '',
      amount: Number(e.amount || 0).toFixed(2),
      note: e.note || '',
      receipt: ''
    })

    sheet.getRow(rowIndex).height = 80

    // Add image if exists
    if (e.receiptImage) {
      try {
        // Fetch image from Cloudinary URL
        const response = await fetch(e.receiptImage)
        const arrayBuffer = await response.arrayBuffer()
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        )

        const imageId = workbook.addImage({
          base64,
          extension: 'jpeg'
        })

        sheet.addImage(imageId, {
          tl: { col: 4, row: rowIndex - 1 },
          br: { col: 5, row: rowIndex },
          editAs: 'oneCell'
        })

      } catch (err) {
        console.error('Image fetch error:', err)
        sheet.getRow(rowIndex).getCell('receipt').value = e.receiptImage
      }
    }

    // Alternate row color
    if (rowIndex % 2 === 0) {
      sheet.getRow(rowIndex).eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F5F5' }
        }
      })
    }
  }

  // Download file
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}