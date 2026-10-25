export const convertToCSV = (data: any[], headers: { key: string; label: string }[]) => {
    const headerRow = headers.map(h => h.label).join(',');
    const rows = data.map(item => 
      headers.map(h => {
        const value = item[h.key];
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    ).join('\n');
  
    return `${headerRow}\n${rows}`;
  };
  
  export const downloadCSV = (csvData: string, filename: string) => {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };