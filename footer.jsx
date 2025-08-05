import React from 'react';
import './footer.css';

const Footer = () => {
  return (
    <footer className="footer-container">
      <div className="footer-content">
        <div className="footer-links-grid">
          <a href="https://fred.stlouisfed.org" target="_blank" rel="noopener noreferrer">FRED</a>
          <a href="https://www.cmegroup.com" target="_blank" rel="noopener noreferrer">CME Group</a>
          <a href="https://www.federalreserve.gov/newsevents/speeches.htm" target="_blank" rel="noopener noreferrer">FED Speakers</a>
          <a href="https://www.bloomberg.com" target="_blank" rel="noopener noreferrer">Bloomberg</a>
          <a href="https://www.reuters.com" target="_blank" rel="noopener noreferrer">Reuters</a>
          <a href="https://www.cboe.com" target="_blank" rel="noopener noreferrer">CBOE</a>
          <a href="https://www.tradingview.com" target="_blank" rel="noopener noreferrer">TradingView</a>
          <a href="https://www.marketwatch.com" target="_blank" rel="noopener noreferrer">MarketWatch</a>
        </div>
        <hr className="footer-separator" />
        <p className="footer-copy">&copy; 2025 <span className="hawk-brand">HAWK</span> — Market Intelligence</p>
      </div>
    </footer>
  );
};

export default Footer;
