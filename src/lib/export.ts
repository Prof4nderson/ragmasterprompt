export function downloadTxt(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadPdf(filename: string, title: string, text: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  doc.setFont("courier", "bold");
  doc.setFontSize(12);
  doc.text(title.slice(0, 90), margin, margin);

  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  const lines: string[] = doc.splitTextToSize(text, pageW - margin * 2);
  let y = margin + 26;
  for (const line of lines) {
    if (y > pageH - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += 12;
  }
  // Usa o mesmo mecanismo de download do TXT (âncora + blob), mais confiável
  // que o save() interno do jsPDF em alguns navegadores.
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
