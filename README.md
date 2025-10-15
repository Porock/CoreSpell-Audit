# 🔍 CoreSpell Audit - Professional Spell Checker for QA

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-blue)](https://chrome.google.com/webstore)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Made for QA](https://img.shields.io/badge/Made%20for-QA%20Engineers-green)](https://github.com)

> Professional spell checking extension designed specifically for QA engineers and content quality professionals.

## ✨ Features

### 🎯 **Whole Page Scanning**
- Checks **ALL** text on the page, not just input fields
- Real-time API-powered spell checking using Yandex.Speller
- Supports **Russian** and **English** languages simultaneously

### 🎨 **Smart Visual Highlighting**
- 🟡 **Yellow background** on all errors for instant visibility
- 🟠 **Pulsing orange animation** on current error
- ⚡ **One-click navigation** between errors
- 🔴 **Red wavy underline** for traditional spell-check feel

### 📚 **Custom Dictionary**
- Add false positives to your personal dictionary
- Persistent storage across browser sessions
- View and manage dictionary entries
- Clear dictionary option

### ⚡ **QA-Optimized Workflow**
- Quick error navigation with counter
- Visual progress indicators
- Non-intrusive UI
- Easy toggle on/off
- Keyboard-friendly

## 🚀 Installation

### From Source (Development)

1. **Clone the repository:**
```bash
git clone https://github.com/Porock/CoreSpell-Audit.git
cd corespell-audit
```

2. **Load in Chrome:**
   - Open `chrome://extensions/`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select the `corespell-audit` folder

### From Chrome Web Store

*Coming soon...*

## 📖 Usage

### Basic Workflow

1. **Navigate** to any webpage with text
2. **Click** the CoreSpell Audit extension icon
3. **Press** "Enable Check" button
4. **Wait** for scanning to complete (progress shown)
5. **Click** on error count to navigate through errors
6. **Click** on any error to see suggestions

### Managing False Positives

When you encounter a false positive:
1. Click on the highlighted "error"
2. Choose **"Add to Dictionary"**
3. The word will be ignored in future checks
4. Access dictionary via popup settings

### Navigation Tips

- **Click error counter**: Cycles through all errors
- **Hover over errors**: See quick suggestions
- **Click on error**: Open detailed modal with all suggestions
- **Smooth scrolling**: Automatically centers current error

## 🛠️ Technical Details

### Files Structure

```
corespell-audit/
├── manifest.json          # Extension configuration
├── content.js            # Main content script
├── styles.css            # Error highlighting styles
├── popup.html            # Extension popup UI
├── popup.js              # Popup logic
├── background.js         # Background service worker
├── icon16.png
├── icon48.png
├── icon128.png
└── README.md
```

### API Integration

CoreSpell Audit uses the **Yandex.Speller API** for spell checking:
- Endpoint: `https://speller.yandex.net/services/spellservice.json/checkTexts`
- Method: POST
- Free to use
- No API key required
- Supports batch requests

### Permissions

- `activeTab` - Access current page content
- `storage` - Store custom dictionary
- `contextMenus` - Right-click menu options

## 🎨 Customization

### Changing Highlight Colors

Edit `styles.css`:

```css
/* All errors background */
.qa-text-error {
  background-color: rgba(255, 235, 59, 0.25); /* Yellow */
}

/* Current error highlight */
.qa-text-highlight {
  background-color: rgba(255, 87, 34, 0.5); /* Orange */
}
```

### Adding More Languages

Yandex.Speller supports multiple languages. To enable more:
1. No code changes needed
2. API automatically detects language
3. Works with: Russian, English, Ukrainian

## 🧪 Development

### Running Tests

```bash
# Manual testing checklist:
1. Load extension in Chrome
2. Visit test pages with errors
3. Enable checking
4. Verify highlighting
5. Test navigation
6. Test dictionary functions
```

### Debugging

1. Open Chrome DevTools (F12)
2. Check Console for logs
3. Look for `scrollToNextError` logs
4. Verify API responses

### Building for Production

1. Remove console.log statements
2. Minify CSS/JS (optional)
3. Compress icons
4. Update version in manifest.json
5. Create ZIP for Chrome Web Store

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Guidelines

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Ideas for Contributions

- [ ] Add LanguageTool API integration
- [ ] Grammar checking (not just spelling)
- [ ] Export error report as CSV
- [ ] Keyboard shortcuts
- [ ] Dark theme
- [ ] More language support
- [ ] Context menu integration
- [ ] Settings page

## 📝 Changelog

### Version 1.0.0 (Current)
- ✅ Initial release
- ✅ Yandex.Speller integration
- ✅ Visual error highlighting
- ✅ Navigation system
- ✅ Custom dictionary
- ✅ Popup interface

## 🐛 Known Issues

- Large pages (10,000+ words) may take 10-15 seconds to check
- Some dynamically loaded content may require page refresh
- API rate limits apply (public endpoint)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💙 Support Development

CoreSpell Audit is free and open-source, maintained in my spare time. If it saves you time and makes your QA work easier, consider supporting its development:

### ☕ Buy Me a Coffee
**[buymeacoffee.com](https://buymeacoffee.com/ivancore)**
The easiest way to support with a one-time donation. Every coffee helps! ☕

### 💜 GitHub Sponsors
**[github.com/sponsors](https://github.com/sponsors/Porock)**
Support through GitHub with monthly or one-time sponsorships. Perfect for companies!

### 💳 ЮMoney (Для России)
**[yoomoney.ru/fundraise](https://yoomoney.ru/fundraise/1DDGHSA5KIE.251015)**
Для пользователей из России - поддержка рублями.

### ₿ Crypto Donations
**Bitcoin (BTC):** `bitcoin:bc1q3a37evhwjzq32x4emwakfw978cl4k6aj94nrxd`
**Ethereum (ETH):** `ethereum:0x82c4c497418bf61bd1339758e0ead9ee72e7b2f3`

For tech-savvy supporters who prefer cryptocurrency.

---

Your support helps:
- 🔧 Maintain and update the extension
- 🚀 Add new features and improvements
- 🐛 Fix bugs and issues faster
- 📚 Create better documentation
- ⚡ Keep the project alive and active

**Every donation, no matter how small, is deeply appreciated!** 🙏

## 🙏 Acknowledgments

- [Yandex.Speller](https://yandex.ru/dev/speller/) for the spell checking API
- Chrome Extensions documentation
- QA community for feedback and ideas

## 📧 Contact

- **Issues**: [GitHub Issues](https://github.com/Porock/corespell-audit/issues)
- **Email**: korochentsev@gmail.com
- **Telegram**: @IvanCore

## 🌟 Support the Project

If you find CoreSpell Audit useful, please:
- ⭐ Star the repository
- 🐛 Report bugs
- 💡 Suggest features
- 📢 Share with QA community
- 💙 Consider a donation

---

**Made with ❤️ for QA Engineers**

*Happy Testing! 🚀*