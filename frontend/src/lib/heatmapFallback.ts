/** Client-side heatmap when live simulation data is unavailable. */
export function generateFallbackHeatmap(
  lengthM: number,
  widthM: number,
  baseTempC: number,
  externalTempC: number,
  qSolar: number,
): number[][] {
  const rows = Math.max(Math.floor(lengthM / 2), 4);
  const cols = Math.max(Math.floor(widthM / 2), 4);
  const centerR = (rows - 1) / 2;
  const centerC = (cols - 1) / 2;
  const maxDist = Math.sqrt(centerR ** 2 + centerC ** 2) || 1;
  const solarBoost = qSolar * 0.015;

  const matrix: number[][] = [];
  for (let row = 0; row < rows; row++) {
    const rowData: number[] = [];
    for (let col = 0; col < cols; col++) {
      const dist = Math.sqrt((row - centerR) ** 2 + (col - centerC) ** 2);
      const edgeFactor = dist / maxDist;
      let temp = baseTempC + solarBoost * (1 - edgeFactor * 0.6);
      temp -= edgeFactor * Math.max(baseTempC - externalTempC, 0) * 0.08;
      rowData.push(Math.round(temp * 100) / 100);
    }
    matrix.push(rowData);
  }

  return matrix;
}
