import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scenesDir = path.join(__dirname, '..', '..', 'apps', 'web', 'src', 'content', 'scenes');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      if (dirPath.endsWith('.json')) {
        callback(dirPath);
      }
    }
  });
}

function analyzeScenes() {
  let results = [];
  walkDir(scenesDir, (filePath) => {
    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    try {
      const data = JSON.parse(content);
      const numSteps = data.steps ? data.steps.length : 0;
      const numVisuals = data.visuals ? data.visuals.length : 0;
      const fileName = path.basename(filePath);
      const relDir = path.basename(path.dirname(filePath));
      const identifier = `${relDir}/${fileName}`;
      const actions = data.steps ? data.steps.reduce((acc, curr) => acc + (curr.actions ? curr.actions.length : 0), 0) : 0;

      // Also count size of textual explanations
      const explanationSize = data.explanation ? JSON.stringify(data.explanation).length : 0;
      const codeSize = data.code && data.code.source ? data.code.source.length : 0;

      results.push({
        id: identifier,
        size: stats.size,
        steps: numSteps,
        visuals: numVisuals,
        actions: actions,
        textSize: explanationSize + codeSize
      });
    } catch (e) {
      console.error('Error parsing', filePath);
    }
  });

  results.sort((a, b) => a.size - b.size);
  console.log('Results sorted by size:');
  console.table(results);

  // Simple Linear Regression: Size ~ a * Steps + b * Visuals + c
  // We can do a rudimentary gradient descent or matrix inversion.
  // Lets just output the averages to see simple impact.
  let totalSize = 0, totalSteps = 0, totalVisuals = 0, totalActions = 0, totalText = 0;
  results.forEach(r => {
    totalSize += r.size;
    totalSteps += r.steps;
    totalVisuals += r.visuals;
    totalActions += r.actions;
    totalText += r.textSize;
  });

  const avgSize = totalSize / results.length;
  const avgSteps = totalSteps / results.length;
  const avgVisuals = totalVisuals / results.length;
  const avgActions = totalActions / results.length;

  console.log(`\nAverages: Size: ${(avgSize / 1024).toFixed(2)} KB, Steps: ${avgSteps.toFixed(1)}, Visuals: ${avgVisuals.toFixed(1)}, Actions: ${avgActions.toFixed(1)}`);
  console.log(`Avg Size per Step: ${(avgSize / avgSteps).toFixed(0)} bytes`);
  console.log(`Avg Size per Visual: ${(avgSize / avgVisuals).toFixed(0)} bytes`);
  console.log(`Avg Size per Action: ${(avgSize / avgActions).toFixed(0)} bytes`);
}

analyzeScenes();
