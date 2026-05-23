import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

export async function exportToExcel(expenses) {

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Expenses')

  // Columns
  sheet.columns = [
    { header: 'Amount', key: 'amount', width: 12 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Note', key: 'note', width: 25 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Receipt Image', key: 'image', width: 30 }
  ]

  for (let i = 0; i < expenses.length; i++) {

    const item = expenses[i]

    const row = sheet.addRow({
      amount: item.amount,
      category: item.category,
      note: item.note,
      date: item.date,
      image: 'View Below'
    })

    // OPTIONAL: insert image if exists
    if (item.imageUrl) {

      try {

        const response = await fetch(item.imageUrl)
        const buffer = await response.arrayBuffer()

        const imageId = workbook.addImage({
          buffer: buffer,
          extension: 'jpeg'
        })

        sheet.addImage(imageId, {
          tl: { col: 4, row: i + 1 },
          ext: { width: 120, height: 120 }
        })

      } catch (err) {
        console.log('Image load failed:', err)
      }

    }
  }

  const buffer = await workbook.xlsx.writeBuffer()

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })

  saveAs(blob, 'expenses.xlsx')
}