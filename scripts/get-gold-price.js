/* eslint-disable @typescript-eslint/no-require-imports */
const puppeteer = require('puppeteer');
const fs = require('fs');
const { saveResult } = require('./redis-service');
const Redis = require('ioredis');

/**
 * Tìm Chromium executable path
 */
function findChromiumPath() {
  try {
    // Thử lấy executable path từ Puppeteer
    const executablePath = puppeteer.executablePath();
    if (executablePath && fs.existsSync(executablePath)) {
      return executablePath;
    }
  } catch (error) {
    console.error('Không tìm thấy Chromium từ Puppeteer:', error.message);
  }

  // Thử các đường dẫn phổ biến
  const commonPaths = [
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  for (const chromePath of commonPaths) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }

  return null;
}

// Helper function để lấy Redis client
const getRedisClient = () => {
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
};

// Helper function để lấy giá vàng đã gửi gần nhất
async function getLastSentGoldPrice() {
  const redis = getRedisClient();
  try {
    await redis.connect();
    const key = 'gold:price:last:sent';
    const data = await redis.get(key);
    await redis.quit();
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('Error getting last sent gold price:', error.message);
    return null;
  }
}

// Helper function để lưu giá vàng đã gửi (TTL 30 phút = 1800 giây)
async function saveLastSentGoldPrice(priceData) {
  const redis = getRedisClient();
  try {
    await redis.connect();
    const key = 'gold:price:last:sent';
    await redis.setex(key, 1800, JSON.stringify(priceData)); // 30 phút = 1800 giây
    await redis.quit();
  } catch (error) {
    console.error('Error saving last sent gold price:', error.message);
    // Ignore error, không block việc gửi
  }
}

// Helper function để so sánh giá vàng có thay đổi không
function compareGoldPrices(currentPrices, lastPrices) {
  if (!lastPrices || !lastPrices.results || lastPrices.results.length === 0) {
    return true; // Chưa có giá cũ, coi như có thay đổi
  }

  if (currentPrices.length !== lastPrices.results.length) {
    return true; // Số lượng loại vàng khác nhau
  }

  // So sánh từng loại vàng
  for (let i = 0; i < currentPrices.length; i++) {
    const current = currentPrices[i];
    const last = lastPrices.results.find(p => p.loaiVang === current.loaiVang);

    if (!last) {
      return true; // Có loại vàng mới
    }

    // So sánh giá mua vào và bán ra
    if (current.giaMuaVao !== last.giaMuaVao || current.giaBanRa !== last.giaBanRa) {
      return true; // Giá đã thay đổi
    }
  }

  return false; // Giá không thay đổi
}

/**
 * Script để lấy giá vàng từ trang PNJ
 * URL: https://www.pnj.com.vn/site/gia-vang
 */
async function getGoldPrice() {
  let browser;
  try {
    console.error('Đang khởi động browser...');

    // Tìm Chromium executable path
    const executablePath = findChromiumPath();

    // Kiểm tra xem executable có tồn tại và có thể truy cập không
    if (executablePath) {
      try {
        if (!fs.existsSync(executablePath)) {
          console.error(`Chromium executable không tồn tại: ${executablePath}`);
        } else {
          console.error(`Sử dụng Chromium tại: ${executablePath}`);
        }
      } catch (err) {
        console.error(`Lỗi khi kiểm tra Chromium: ${err.message}`);
      }
    }

    // Thử các cấu hình khác nhau
    const launchConfigs = [
      // Config 1: Với executablePath, headless new, không single-process
      {
        headless: 'new',
        executablePath: executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
        ],
        timeout: 30000,
      },
      // Config 2: Với executablePath, headless true, không single-process
      {
        headless: true,
        executablePath: executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
        ],
        timeout: 30000,
      },
      // Config 3: Không có executablePath, để Puppeteer tự tải
      {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
        ],
        timeout: 60000, // Tăng timeout khi tải Chromium
      },
      // Config 4: Minimal config
      {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: 30000,
      },
    ];

    let lastError = null;
    for (let i = 0; i < launchConfigs.length; i++) {
      const config = launchConfigs[i];
      try {
        console.error(`Thử cấu hình ${i + 1}/${launchConfigs.length}...`);

        // Bỏ executablePath nếu không tồn tại
        if (config.executablePath && !fs.existsSync(config.executablePath)) {
          delete config.executablePath;
          console.error('ExecutablePath không tồn tại, bỏ qua...');
        }

        browser = await puppeteer.launch(config);
        console.error(`Browser đã khởi động thành công với cấu hình ${i + 1}!`);
        break;
      } catch (launchError) {
        lastError = launchError;
        console.error(`Cấu hình ${i + 1} thất bại: ${launchError.message}`);

        // Nếu là lỗi cuối cùng, throw
        if (i === launchConfigs.length - 1) {
          throw launchError;
        }
      }
    }

    if (!browser) {
      throw lastError || new Error('Không thể khởi động browser với bất kỳ cấu hình nào');
    }

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

    // Kiểm tra giá vàng đã thay đổi so với lần gửi gần nhất
    const lastSentPrice = await getLastSentGoldPrice();
    const priceChanged = compareGoldPrices(formattedData, lastSentPrice);

    // Nếu giá không thay đổi và đã gửi trong 30 phút, không gửi webhook
    const skipWebhook = !priceChanged && lastSentPrice !== null;

    // Build markdown content for webhook
    let markdownContent = `# Giá vàng PNJ\n\n`;
    markdownContent += `**Nguồn:** https://www.pnj.com.vn/site/gia-vang\n`;
    markdownContent += `**Thời gian:** ${new Date().toLocaleString('vi-VN')}\n\n`;
    markdownContent += `## Danh sách giá vàng:\n\n`;

    formattedData.forEach((item) => {
      markdownContent += `### ${item.loaiVang}\n`;
      markdownContent += `- **Giá mua vào:** ${item.giaMuaVao !== null ? item.giaMuaVao.toLocaleString('vi-VN') + ' VNĐ' : 'N/A'}\n`;
      markdownContent += `- **Giá bán ra:** ${item.giaBanRa !== null ? item.giaBanRa.toLocaleString('vi-VN') + ' VNĐ' : 'N/A'}\n`;
      if (item.chenhLech !== null) {
        markdownContent += `- **Chênh lệch:** ${item.chenhLech.toLocaleString('vi-VN')} VNĐ\n`;
      }
      markdownContent += `\n`;
    });

    const result = {
      success: true,
      type: 'markdown',
      content: markdownContent,
      skipWebhook: skipWebhook, // Không gửi webhook nếu giá không thay đổi trong 30 phút
      jsonContent: {
        timestamp: new Date().toISOString(),
        source: 'https://www.pnj.com.vn/site/gia-vang',
        data: formattedData,
        priceChanged: priceChanged,
        lastSentTimestamp: lastSentPrice?.timestamp || null,
      },
    };

    // Nếu giá thay đổi hoặc chưa từng gửi, lưu giá mới
    if (priceChanged) {
      await saveLastSentGoldPrice({
        timestamp: new Date().toISOString(),
        results: formattedData,
      });
    }

    // Save result to Redis if execution ID is provided
    await saveResult(result);

    // Output JSON result to stdout (for backward compatibility and fallback)
    // Logs go to stderr so they don't interfere with JSON output
    if (skipWebhook) {
      console.error('Lấy giá vàng thành công! Giá không thay đổi, bỏ qua webhook.');
    } else {
      console.error('Lấy giá vàng thành công!');
    }
    console.log(JSON.stringify(result));

    return result;
  } catch (error) {
    // Xử lý lỗi chi tiết hơn
    let errorMessage = error.message || String(error);
    let errorDetails = {};

    // Kiểm tra các lỗi phổ biến
    if (errorMessage.includes('ECONNRESET') || errorMessage.includes('ECONNREFUSED')) {
      errorMessage = `Lỗi kết nối khi khởi động browser: ${errorMessage}. ` +
        `Có thể do Chromium executable bị corrupt hoặc vấn đề với Puppeteer cache. ` +
        `Thử xóa cache: rm -rf ~/.cache/puppeteer (Linux/Mac) hoặc xóa %USERPROFILE%\\.cache\\puppeteer (Windows)`;
      errorDetails = {
        type: 'connection_error',
        suggestion: 'Xóa Puppeteer cache và thử lại, hoặc cài đặt lại Puppeteer',
      };
    } else if (errorMessage.includes('Executable doesn\'t exist') ||
        errorMessage.includes('Browser closed') ||
        errorMessage.includes('Target closed')) {
      errorMessage = `Không thể khởi động browser: ${errorMessage}. ` +
        `Hãy đảm bảo Chromium/Chrome đã được cài đặt hoặc Puppeteer có thể tải về Chromium.`;
      errorDetails = {
        type: 'browser_launch_error',
        suggestion: 'Kiểm tra cài đặt Chromium/Chrome hoặc cài đặt dependencies hệ thống cần thiết',
      };
    } else if (errorMessage.includes('timeout')) {
      errorMessage = `Timeout khi thực hiện: ${errorMessage}`;
      errorDetails = {
        type: 'timeout_error',
        suggestion: 'Thử tăng timeout hoặc kiểm tra kết nối mạng',
      };
    } else if (errorMessage.includes('net::')) {
      errorMessage = `Lỗi kết nối mạng: ${errorMessage}`;
      errorDetails = {
        type: 'network_error',
        suggestion: 'Kiểm tra kết nối mạng và URL',
      };
    }

    const errorResult = {
      success: false,
      type: 'text',
      content: `Lỗi khi lấy giá vàng: ${errorMessage}`,
      error: errorMessage,
      jsonContent: {
        timestamp: new Date().toISOString(),
        error: errorMessage,
        ...errorDetails,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
    };

    // Save error result to Redis if execution ID is provided
    await saveResult(errorResult);

    // Output JSON result to stdout even on error (for backward compatibility)
    console.error('Lỗi khi lấy giá vàng:', errorMessage);
    if (error.stack && process.env.NODE_ENV === 'development') {
      console.error('Stack trace:', error.stack);
    }
    console.log(JSON.stringify(errorResult));

    // Đảm bảo browser được đóng
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Lỗi khi đóng browser:', closeError.message);
      }
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

