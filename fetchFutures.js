require('dotenv').config();
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs').promises;
const cron = require('node-cron');

// Contract lists from mainSheetDataTemplate
const SOFR_CONTRACTS = [
  'Jun25', 'Jul25', 'Aug25', 'Sep25', 'Oct25', 'Dec25',
  'Jan26', 'Mar26', 'Jun26', 'Sep26'
];
const ZQ_CONTRACTS = [
  'Jun25', 'Jul25', 'Aug25', 'Sep25', 'Oct25', 'Nov25', 'Dec25',
  'Jan26', 'Feb26', 'Mar26', 'Apr26', 'May26', 'Jun26', 'Jul26',
  'Aug26', 'Sep26', 'Oct26', 'Nov26', 'Dec26'
];

// CME quote page URLs
const CME_ZQ_URL = 'https://www.cmegroup.com/markets/interest-rates/stirs/30-day-federal-fund.quotes.html';
const CME_SR3_URL = 'https://www.cmegroup.com/markets/interest-rates/stirs/three-month-sofr.quotes.html';

// Map month codes to contract names (e.g., 'M' -> 'Jun')
const MONTH_MAP = {
  'F': 'Jan', 'G': 'Feb', 'H': 'Mar', 'J': 'Apr', 'K': 'May', 'M': 'Jun',
  'N': 'Jul', 'Q': 'Aug', 'U': 'Sep', 'V': 'Oct', 'X': 'Nov', 'Z': 'Dec'
};

// Scrape CME quote page
const scrapeCME = async (url, symbolPrefix, contractList) => {
  console.log(`Scraping ${symbolPrefix} data from ${url}`);
  try {
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
    const res = await fetch(url, { headers });
    console.log(`Response status for ${symbolPrefix}: ${res.status}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const html = await res.text();
    const $ = cheerio.load(html);
    const rows = $('table.table-responsive--fixed tbody tr');
    
    console.log(`Found ${rows.length} table rows for ${symbolPrefix}`);
    const data = [];
    
    rows.each((i, row) => {
      const cols = $(row).find('td');
      const symbol = $(cols[0]).text().trim();
      if (!symbol.startsWith(symbolPrefix)) return;
      
      const settlePrice = $(cols[7]).text().trim();
      data.push({
        symbol,
        settle: parseFloat(settlePrice) || null
      });
    });
    
    console.log(`Parsed ${symbolPrefix} data:`, data);
    const mappedData = mapToContracts(data, contractList, symbolPrefix);
    if (!mappedData.length) throw new Error('No valid contracts mapped');
    
    await fs.writeFile(`../${symbolPrefix}_futures.json`, JSON.stringify(mappedData, null, 2));
    console.log(`Saved ${symbolPrefix} data: ${mappedData.length} contracts`);
    return mappedData;
  } catch (error) {
    console.error(`Error scraping ${symbolPrefix} data:`, error.message);
    return [];
  }
};

// Map scraped data to your contract format
const mapToContracts = (data, contractList, prefix) => {
  console.log(`Mapping ${prefix} data:`, data);
  return contractList.map(contract => {
    const month = contract.slice(0, 3);
    const year = contract.slice(3);
    const monthCode = Object.keys(MONTH_MAP).find(key => MONTH_MAP[key] === month);
    if (!monthCode) {
      console.log(`No month code for ${contract}`);
      return null;
    }
    const symbol = `${prefix}${monthCode}${year}`;
    const row = data.find(d => d.symbol === symbol);
    return {
      contract,
      price: row && row.settle ? row.settle : null
    };
  }).filter(item => item && item.price !== null);
};

// Run immediately and schedule daily at 6:30 PM IST (13:00 UTC)
const updateData = async () => {
  console.log('Starting data update...');
  await scrapeCME(CME_ZQ_URL, 'ZQ', ZQ_CONTRACTS);
  await scrapeCME(CME_SR3_URL, 'SR3', SOFR_CONTRACTS);
};

// Initial scrape
updateData();

// Schedule daily update
cron.schedule('30 18 * * *', updateData);