# Invoice Generator

Single-page application for creating and exporting invoices.

## Usage

1. Open the `index.html` file in your browser.
2. Fill in the seller, client, invoice details, and line items.
3. All values are saved to the browser automatically and restored the next time you open the page.
4. Click **Export PDF** to save the current invoice preview as a PDF file.

To serve the files locally you can use any static server, for example:

```bash
python3 -m http.server 3000
```

After that the page will be available at <http://localhost:3000/index.html>.
