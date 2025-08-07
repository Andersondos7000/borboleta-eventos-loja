// logExport.ts
// Utilitário para capturar e exportar logs do console do navegador

let logs: string[] = [];

function formatLog(type: string, args: any[]) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${type}] ${args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ')}`;
}

['log', 'error', 'warn'].forEach(type => {
  const orig = console[type as keyof typeof console];
  (console as any)[type] = function (...args: any[]) {
    logs.push(formatLog(type, args));
    orig.apply(console, args);
  };
});

export function getLogs() {
  return logs.join('\n');
}

export function downloadLogs(filename = 'logs.txt') {
  const blob = new Blob([getLogs()], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Para resetar os logs manualmente
export function clearLogs() {
  logs = [];
}
