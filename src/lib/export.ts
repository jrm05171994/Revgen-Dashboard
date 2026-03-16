// src/lib/export.ts
// Dynamic imports so these heavy libs don't bloat the initial bundle

export async function exportElement(
  element: HTMLElement,
  filename: string,
  format: "png" | "pdf"
): Promise<void> {
  const html2canvas = (await import("html2canvas")).default;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  if (format === "png") {
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    return;
  }

  // PDF
  const { jsPDF } = await import("jspdf");
  const imgData = canvas.toDataURL("image/png");
  const orientation = canvas.width > canvas.height ? "landscape" : "portrait";
  const pdf = new jsPDF({
    orientation,
    unit: "px",
    format: [canvas.width / 2, canvas.height / 2], // /2 because scale:2
  });
  pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
  pdf.save(`${filename}.pdf`);
}
