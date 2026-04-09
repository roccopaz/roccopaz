/* ============================================
   CSV Parser — Parse & Export weekly data
   ============================================ */

const CSVParser = {
  /**
   * Parse a CSV string into an array of week objects.
   * Expects a header row matching the field keys in FIELDS.
   */
  parse(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length !== headers.length) continue;

      const row = {};
      headers.forEach((header, idx) => {
        const val = values[idx];
        row[header] = header === 'week' ? val : parseFloat(val);
      });

      if (row.week && !isNaN(row.revenue)) {
        rows.push(row);
      }
    }

    return rows;
  },

  /**
   * Export an array of week objects to a CSV string.
   */
  export(data) {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const lines = [headers.join(',')];

    data.forEach(row => {
      const values = headers.map(h => row[h] ?? '');
      lines.push(values.join(','));
    });

    return lines.join('\n');
  },

  /**
   * Trigger a CSV file download in the browser.
   */
  download(data, filename = 'amazon-dashboard-export.csv') {
    const csvText = this.export(data);
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  },

  /**
   * Read a File object and return parsed rows via a Promise.
   */
  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const rows = this.parse(e.target.result);
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
};
