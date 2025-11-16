/* eslint-disable @typescript-eslint/no-require-imports */
const puppeteer = require('puppeteer');

/**
 * Script để lấy giá vàng từ trang PNJ
 * URL: https://www.pnj.com.vn/site/gia-vang
 */
async function getGoldPrice() {
  let browser;
  try {
    console.log('Đang khởi động browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('Đang truy cập trang PNJ...');
    await page.goto('https://www.pnj.com.vn/site/gia-vang', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Đợi bảng giá vàng load
    await page.waitForSelector('table, .gold-price-table, [class*="price"], [class*="gold"]', {
      timeout: 10000,
    });

    console.log('Đang lấy dữ liệu giá vàng...');

    // Đợi thêm một chút để đảm bảo JavaScript đã render xong
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Lấy dữ liệu từ bảng giá vàng
    const goldPrices = await page.evaluate(() => {
      const results = [];

      // Helper function để parse giá từ text
      const parsePrice = (text) => {
        if (!text) return null;
        // Loại bỏ các ký tự không phải số và dấu chấm/phẩy
        const cleaned = text.replace(/[^\d,.]/g, '').replace(/,/g, '');
        const price = parseFloat(cleaned);
        return isNaN(price) ? null : price;
      };

      // Helper function để tìm index của cột
      const findColumnIndex = (headers, keywords) => {
        for (let i = 0; i < headers.length; i++) {
          const header = headers[i].toLowerCase();
          if (keywords.some(keyword => header.includes(keyword))) {
            return i;
          }
        }
        return -1;
      };

      // Tìm tất cả các bảng trên trang
      const tables = document.querySelectorAll('table');

      if (tables.length > 0) {
        tables.forEach((table) => {
          const headers = [];
          const rows = [];

          // Lấy headers
          const headerRows = table.querySelectorAll('thead tr, tr:first-child');
          if (headerRows.length > 0) {
            headerRows[0].querySelectorAll('th, td').forEach((cell) => {
              headers.push(cell.textContent.trim());
            });
          }

          // Lấy dữ liệu các dòng
          const dataRows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
          dataRows.forEach((row) => {
            const cells = row.querySelectorAll('td, th');
            if (cells.length > 0) {
              const rowData = Array.from(cells).map((cell) => cell.textContent.trim());
              rows.push(rowData);
            }
          });

          // Parse dữ liệu từ bảng
          if (headers.length > 0 && rows.length > 0) {
            // Tìm các cột quan trọng
            const nameColIndex = findColumnIndex(headers, ['loại', 'tên', 'vàng', 'type', 'name']);
            const buyColIndex = findColumnIndex(headers, ['mua', 'mua vào', 'buy', 'purchase', 'giá mua']);
            const sellColIndex = findColumnIndex(headers, ['bán', 'bán ra', 'sell', 'giá bán']);

            // Nếu không tìm thấy cột, sử dụng vị trí mặc định
            const actualNameIndex = nameColIndex >= 0 ? nameColIndex : 0;
            const actualBuyIndex = buyColIndex >= 0 ? buyColIndex : (headers.length >= 2 ? 1 : -1);
            const actualSellIndex = sellColIndex >= 0 ? sellColIndex : (headers.length >= 3 ? 2 : -1);

            rows.forEach((row) => {
              if (row.length > 0) {
                const goldType = row[actualNameIndex] || row[0] || 'N/A';

                // Kiểm tra xem dòng này có phải là dòng giá vàng không
                const isGoldRow = goldType && (
                  goldType.toLowerCase().includes('vàng') ||
                  goldType.toLowerCase().includes('sjc') ||
                  goldType.toLowerCase().includes('24k') ||
                  goldType.toLowerCase().includes('18k') ||
                  goldType.toLowerCase().includes('pnj') ||
                  goldType.match(/[\d,]+/)
                );

                if (isGoldRow) {
                  const buyPrice = actualBuyIndex >= 0 && row[actualBuyIndex]
                    ? parsePrice(row[actualBuyIndex])
                    : null;
                  const sellPrice = actualSellIndex >= 0 && row[actualSellIndex]
                    ? parsePrice(row[actualSellIndex])
                    : null;

                  // Tính chênh lệch
                  const difference = (buyPrice !== null && sellPrice !== null)
                    ? (sellPrice - buyPrice)
                    : null;

                  results.push({
                    loaiVang: goldType,
                    giaMuaVao: buyPrice,
                    giaBanRa: sellPrice,
                    chenhLech: difference,
                  });
                }
              }
            });
          }
        });
      }

      // Nếu không tìm thấy trong bảng, thử parse từ text
      if (results.length === 0) {
        const bodyText = document.body.innerText;
        const lines = bodyText.split('\n').filter((line) => {
          const trimmed = line.trim();
          return (
            trimmed.length > 0 &&
            (trimmed.toLowerCase().includes('vàng') ||
              trimmed.toLowerCase().includes('sjc') ||
              trimmed.match(/[\d,]+\.?\d*/))
          );
        });

        // Thử parse từ các dòng text
        lines.forEach((line, index) => {
          const lowerLine = line.toLowerCase();
          if (lowerLine.includes('vàng') || lowerLine.includes('sjc')) {
            // Tìm giá trong các dòng tiếp theo
            const nextLines = lines.slice(index + 1, index + 5);
            const prices = nextLines
              .map(l => parsePrice(l))
              .filter(p => p !== null);

            if (prices.length >= 2) {
              const buyPrice = prices[0];
              const sellPrice = prices[1];
              results.push({
                loaiVang: line.trim(),
                giaMuaVao: buyPrice,
                giaBanRa: sellPrice,
                chenhLech: sellPrice - buyPrice,
              });
            }
          }
        });
      }

      return results;
    });

    await browser.close();

    // Format kết quả
    const formattedData = goldPrices.map((item) => ({
      loaiVang: item.loaiVang || 'N/A',
      giaMuaVao: item.giaMuaVao !== null ? item.giaMuaVao : null,
      giaBanRa: item.giaBanRa !== null ? item.giaBanRa : null,
      chenhLech: item.chenhLech !== null ? item.chenhLech : null,
    }));

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      source: 'https://www.pnj.com.vn/site/gia-vang',
      data: formattedData,
    };

    // Output JSON result to stdout (for automation worker to parse)
    // Logs go to stderr so they don't interfere with JSON output
    console.error('Lấy giá vàng thành công!');
    console.log(JSON.stringify(result));

    return result;
  } catch (error) {
    const errorResult = {
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message,
    };

    // Output JSON result to stdout even on error
    console.error('Lỗi khi lấy giá vàng:', error);
    console.log(JSON.stringify(errorResult));

    if (browser) {
      await browser.close();
    }
    return errorResult;
  }
}

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
  getGoldPrice()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Lỗi:', error);
      process.exit(1);
    });
}

module.exports = { getGoldPrice };

