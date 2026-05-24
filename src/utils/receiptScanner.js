import imageCompression from 'browser-image-compression';

export async function scanReceipt(file) {
  try {
    console.log(`Original image size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

    // ========================
    // COMPRESSION CONFIGURATION
    // ========================
    const compressionOptions = {
      maxSizeMB: 1.2,          // Stays strictly beneath the 1.5MB OCR.space payload ceiling
      maxWidthOrHeight: 1600,  // Sharp standard layout so LHDN can clearly read parameters
      useWebWorker: true,
      initialQuality: 0.85     // 85% high visual quality retention to prevent broken/blurred text
    };

    // Compress the image before translating it to base64
    let processedFile = file;
    if (file.size > 1.2 * 1024 * 1024) {
      try {
        processedFile = await imageCompression(file, compressionOptions);
        console.log(`Compressed image size: ${(processedFile.size / 1024 / 1024).toFixed(2)} MB`);
      } catch (compErr) {
        console.error('Image compression sub-process failed, processing original:', compErr);
      }
    }

    const base64 = await fileToBase64(processedFile);

    const formData = new FormData();
    formData.append('base64Image', base64);
    formData.append('language', 'eng');
    formData.append('OCREngine', '2');
    formData.append('isTable', 'false');
    formData.append('detectOrientation', 'true');
    formData.append('isCreateSearchablePdf', 'false');
    formData.append('isSearchablePdfHideTextLayer', 'false');
    formData.append('scale', 'true');
    formData.append('isOverlayRequired', 'false');

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'apikey': import.meta.env.VITE_OCR_API_KEY },
      body: formData
    });

    const data = await response.json();

    if (!data.ParsedResults || data.ParsedResults.length === 0) {
      console.error('OCR failed:', data);
      return { amount: '', date: '', note: '', category: 'General' };
    }

    const text = data.ParsedResults[0].ParsedText;
    console.log('OCR TEXT:', text);

    const clean = text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    console.log('CLEAN TEXT:', clean);

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // ========================
    // DETECT AMOUNT
    // ========================
    let amount = '';

    // Payment keywords — amounts after these are NOT the total
    const paymentKeywords = [
      'cash', 'payment made', 'credit card', 'debit card',
      'change', 'tender', 'visa', 'mastercard', 'ewallet',
      'touch n go', 'boost', 'grabpay'
    ];

    // Find index where payment section starts
    let paymentStartIdx = lines.length;
    lines.forEach((line, idx) => {
      const lower = line.toLowerCase();
      if (paymentKeywords.some(k => lower.includes(k))) {
        if (idx < paymentStartIdx) paymentStartIdx = idx;
      }
    });

    // Only look for amounts BEFORE payment section
    const prePaymentLines = lines.slice(0, paymentStartIdx);

    // Strategy 1 — find line with GRAND TOTAL keyword
    for (let i = 0; i < prePaymentLines.length; i++) {
      const lower = prePaymentLines[i].toLowerCase();
      if (lower.includes('grand total')) {
        // Check same line
        const sameMatch = prePaymentLines[i].match(/(\d+\.\d{2})/);
        if (sameMatch) { amount = sameMatch[1]; break; }

        // Check previous 3 lines (sideways receipt)
        for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
          const match = prePaymentLines[j].match(/^(\d+\.\d{2})$/);
          if (match) { amount = match[1]; break; }
        }
        if (amount) break;

        // Check next 3 lines
        for (let j = i + 1; j <= Math.min(prePaymentLines.length - 1, i + 3); j++) {
          const match = prePaymentLines[j].match(/^(\d+\.\d{2})$/);
          if (match) { amount = match[1]; break; }
        }
        if (amount) break;
      }
    }

    // Strategy 2 — TOTAL AMOUNT or AMOUNT DUE
    if (!amount) {
      for (let i = 0; i < prePaymentLines.length; i++) {
        const lower = prePaymentLines[i].toLowerCase();
        if (lower.includes('total amount') || lower.includes('amount due') || lower.includes('jumlah')) {
          const sameMatch = prePaymentLines[i].match(/(\d+\.\d{2})/);
          if (sameMatch) { amount = sameMatch[1]; break; }

          for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
            const match = prePaymentLines[j].match(/^(\d+\.\d{2})$/);
            if (match) { amount = match[1]; break; }
          }
          if (amount) break;

          for (let j = i + 1; j <= Math.min(prePaymentLines.length - 1, i + 3); j++) {
            const match = prePaymentLines[j].match(/^(\d+\.\d{2})$/);
            if (match) { amount = match[1]; break; }
          }
          if (amount) break;
        }
      }
    }

    // Strategy 3 — standalone TOTAL keyword
    if (!amount) {
      for (let i = 0; i < prePaymentLines.length; i++) {
        const lower = prePaymentLines[i].toLowerCase();
        if (
          lower === 'total' ||
          lower.match(/^total\s*:?\s*$/) ||
          (lower.includes('total') && !lower.includes('sub') && !lower.includes('qty'))
        ) {
          const sameMatch = prePaymentLines[i].match(/(\d+\.\d{2})/);
          if (sameMatch) { amount = sameMatch[1]; break; }

          // For sideways receipts — amounts may be grouped together
          const standaloneAmounts = [];
          prePaymentLines.forEach(line => {
            if (/^\d+\.\d{2}$/.test(line)) {
              standaloneAmounts.push(parseFloat(line));
            }
          });

          if (standaloneAmounts.length > 0) {
            const validAmounts = standaloneAmounts.filter(a => a > 1);
            if (validAmounts.length > 0) {
              validAmounts.sort((a, b) => a - b);
              amount = validAmounts.length > 1
                ? validAmounts[validAmounts.length - 2].toFixed(2)
                : validAmounts[validAmounts.length - 1].toFixed(2);

              if (validAmounts.length > 1) {
                const largest = validAmounts[validAmounts.length - 1];
                const secondLargest = validAmounts[validAmounts.length - 2];
                if (largest - secondLargest < 5) {
                  amount = largest.toFixed(2);
                }
              }
            }
            break;
          }
        }
      }
    }

    // Strategy 4 — collect all standalone amounts before payment
    if (!amount) {
      const standaloneAmounts = [];
      prePaymentLines.forEach(line => {
        if (/^\d+\.\d{2}$/.test(line)) {
          const val = parseFloat(line);
          if (val > 1) standaloneAmounts.push(val);
        }
      });

      if (standaloneAmounts.length > 0) {
        standaloneAmounts.sort((a, b) => a - b);
        amount = standaloneAmounts[standaloneAmounts.length - 1].toFixed(2);
      }
    }

    // Strategy 5 — RM pattern before payment section
    if (!amount) {
      const prePaymentClean = prePaymentLines.join(' ');
      const rmMatch = prePaymentClean.match(/rm\s*(\d+\.\d{2})/i);
      if (rmMatch) amount = rmMatch[1];
    }

    // Strategy 6 — absolute fallback from full text
    if (!amount) {
      const allNums = [];
      const allNumRegex = /(\d+\.\d{2})/g;
      let m;
      while ((m = allNumRegex.exec(clean)) !== null) {
        const val = parseFloat(m[1]);
        if (val > 1) allNums.push(val);
      }
      if (allNums.length > 0) {
        allNums.sort((a, b) => a - b);
        amount = allNums[allNums.length - 1].toFixed(2);
      }
    }

    // ========================
    // DETECT DATE
    // ========================
    const datePatterns = [
      /(\d{2}\/\d{2}\/\d{4})/,
      /(\d{2}-\d{2}-\d{4})/,
      /(\d{4}-\d{2}-\d{2})/,
      /date\s*[:\-]?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i
    ];

    let date = '';
    for (const pattern of datePatterns) {
      const match = clean.match(pattern);
      if (match) { date = match[1]; break; }
    }

    // ========================
    // DETECT SHOP NAME
    // ========================
    const blacklist = [
      'rm', 'cash', 'receipt', 'date', 'member', 'cashier',
      'sales', 'total', 'qty', 'thank', 'signature', 'point',
      'description', 'tel', 'refund', 'returnable', 'invoice',
      'payment', 'credit', 'debit', 'rounding', 'subtotal',
      'item', 'price', 'discount', 'change', 'balance',
      'jalan', 'lorong', 'taman', 'seksyen', 'http', 'www',
      'bukit', 'rawang', 'selangor', 'kuala', 'lumpur',
      'tax', 'gst', 'sst', 'reg', 'fax', 'no.'
    ];

    const businessKeywords = [
      'sdn bhd', 'enterprise', 'trading', 'store', 'shop',
      'market', 'supermarket', 'restaurant', 'cafe', 'kedai',
      'holdings', 'industries', 'services', 'motor', 'auto',
      'pharmacy', 'clinic', 'hardware', 'construction',
      'petrol', 'station', 'food', 'bakery', 'salon',
      'pasaraya', 'minimarket'
    ];

    let note = '';

    // Pass 1 — business keywords in first 8 lines
    for (const line of lines.slice(0, 8)) {
      const lower = line.toLowerCase();
      if (businessKeywords.some(w => lower.includes(w)) && line.length > 5) {
        note = line;
        break;
      }
    }

    // Pass 2 — ALL CAPS line in first 5 lines
    if (!note) {
      for (const line of lines.slice(0, 5)) {
        const isAllCaps = line === line.toUpperCase() && /[A-Z]/.test(line);
        const hasNumber = /^\d/.test(line);
        const isBlacklisted = blacklist.some(w => line.toLowerCase().includes(w));
        const isPostcode = /\d{5}/.test(line);
        if (isAllCaps && !hasNumber && !isBlacklisted && !isPostcode && line.length > 5) {
          note = line;
          break;
        }
      }
    }

    // Pass 3 — first clean line
    if (!note) {
      for (const line of lines) {
        const lower = line.toLowerCase();
        const isBlacklisted = blacklist.some(w => lower.includes(w));
        const hasNumber = /\d/.test(line);
        const isPostcode = /\d{5}/.test(line);
        if (!isBlacklisted && !hasNumber && !isPostcode && line.length > 5) {
          note = line;
          break;
        }
      }
    }

    // Fallback
    if (!note && lines.length > 0) note = lines[0];

    // Clean up
    note = note
      .replace(/ü/g, 'U')
      .replace(/ö/g, 'O')
      .replace(/ä/g, 'A')
      .replace(/[^\w\s\-&()]/g, '')
      .trim();
    note = note.split('\t')[0].trim();
    if (note.length > 50) note = note.substring(0, 50).trim();

    // ========================
    // KEYWORD CATEGORY
    // ========================
    const lowerNote = note.toLowerCase();
    const lowerClean = clean.toLowerCase();
    let category = 'General';

    if (
      lowerNote.includes('motor') || lowerNote.includes('workshop') ||
      lowerNote.includes('tyre') || lowerNote.includes('spare') ||
      lowerNote.includes('auto') || lowerClean.includes('workshop')
    ) category = 'Maintenance';

    else if (
      lowerNote.includes('petronas') || lowerNote.includes('shell') ||
      lowerNote.includes('petrol') || lowerNote.includes('fuel') ||
      lowerNote.includes('bhp') || lowerNote.includes('caltex')
    ) category = 'Fuel';

    else if (
      lowerNote.includes('restaurant') || lowerNote.includes('cafe') ||
      lowerNote.includes('food') || lowerNote.includes('kedai makan') ||
      lowerClean.includes('nasi') || lowerClean.includes('roti') ||
      lowerClean.includes('mamak') || lowerClean.includes('makan')
    ) category = 'Food';

    else if (
      lowerNote.includes('pasaraya') || lowerNote.includes('supermarket') ||
      lowerNote.includes('market') || lowerNote.includes('store') ||
      lowerClean.includes('baju') || lowerClean.includes('shirt') ||
      lowerClean.includes('jersey') || lowerClean.includes('clothes')
    ) category = 'Shopping';

    else if (
      lowerNote.includes('clinic') || lowerNote.includes('pharmacy') ||
      lowerNote.includes('hospital') || lowerNote.includes('klinik') ||
      lowerClean.includes('panadol') || lowerClean.includes('ubat')
    ) category = 'Health';

    else if (
      lowerNote.includes('telekom') || lowerNote.includes('unifi') ||
      lowerNote.includes('celcom') || lowerNote.includes('maxis') ||
      lowerNote.includes('digi') || lowerNote.includes('tnb') ||
      lowerNote.includes('syabas') || lowerNote.includes('indah water')
    ) category = 'Bills';

    else if (
      lowerNote.includes('grab') || lowerNote.includes('myrapid') ||
      lowerNote.includes('lrt') || lowerNote.includes('mrt') ||
      lowerNote.includes('bus') || lowerNote.includes('taxi')
    ) category = 'Transport';

    // ========================
    // FINAL RESULT
    // ========================
    console.log('FINAL RESULT:', { amount, date, note, category });
    return { amount, date, note, category };

  } catch (error) {
    console.error('Scanner error:', error);
    return { amount: '', date: '', note: '', category: 'General' };
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}