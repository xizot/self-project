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

      // Tìm tất cả các bảng trên trang
      const tables = document.querySelectorAll('table');

      if (tables.length > 0) {
        tables.forEach((table, tableIndex) => {
          const tableData = {
            index: tableIndex + 1,
            headers: [],
            rows: [],
          };

          // Lấy headers
          const headerRows = table.querySelectorAll('thead tr, tr:first-child');
          if (headerRows.length > 0) {
            headerRows[0].querySelectorAll('th, td').forEach((cell) => {
              tableData.headers.push(cell.textContent.trim());
            });
          }

          // Lấy dữ liệu các dòng
          const rows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
          rows.forEach((row) => {
            const cells = row.querySelectorAll('td, th');
            if (cells.length > 0) {
              const rowData = Array.from(cells).map((cell) => cell.textContent.trim());
              // Chỉ lấy các dòng có dữ liệu liên quan đến giá vàng
              if (rowData.some((text) =>
                text.includes('Vàng') ||
                text.includes('SJC') ||
                text.includes('24K') ||
                text.includes('18K') ||
                text.includes('PNJ') ||
                text.match(/[\d,]+\.?\d*/)
              )) {
                tableData.rows.push(rowData);
              }
            }
          });

          if (tableData.headers.length > 0 || tableData.rows.length > 0) {
            results.push(tableData);
          }
        });
      }

      // Nếu không tìm thấy bảng, thử tìm các element có class/id liên quan
      if (results.length === 0) {
        const selectors = [
          '[class*="price"]',
          '[class*="gold"]',
          '[id*="price"]',
          '[id*="gold"]',
          '[class*="table"]',
          '.gia-vang',
          '#gia-vang',
        ];

        selectors.forEach((selector) => {
          try {
            const elements = document.querySelectorAll(selector);
            elements.forEach((el) => {
              const text = el.textContent.trim();
              if (text && text.length > 0) {
                results.push({
                  selector: selector,
                  text: text,
                });
              }
            });
          } catch (e) {
            // Ignore invalid selectors
          }
        });
      }

      // Lấy toàn bộ text content nếu không tìm thấy cấu trúc cụ thể
      if (results.length === 0) {
        const bodyText = document.body.innerText;
        const lines = bodyText.split('\n').filter((line) => {
          const trimmed = line.trim();
          return (
            trimmed.length > 0 &&
            (trimmed.includes('Vàng') ||
              trimmed.includes('SJC') ||
              trimmed.includes('24K') ||
              trimmed.includes('18K') ||
              trimmed.includes('PNJ') ||
              trimmed.match(/[\d,]+\.?\d*/))
          );
        });
        results.push({
          type: 'text',
          lines: lines.slice(0, 100), // Giới hạn 100 dòng đầu
        });
      }

      return results;
    });

    await browser.close();

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      source: 'https://www.pnj.com.vn/site/gia-vang',
      data: goldPrices,
    };

    console.log('Lấy giá vàng thành công!');
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error('Lỗi khi lấy giá vàng:', error);
    if (browser) {
      await browser.close();
    }
    return {
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message,
    };
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

