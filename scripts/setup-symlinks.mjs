import fs from 'node:fs';
import path from 'node:path';

console.log("Setting up AI tool symlinks...");

const tools = [".claude", ".agent", ".agents"];
const dirs = ["agents", "context", "memory", "skills", "tools"];

for (const tool of tools) {
  if (!fs.existsSync(tool)) {
    fs.mkdirSync(tool, { recursive: true });
  }
  
  for (const dir of dirs) {
    const target = path.join('..', '.ai', dir);
    const link = path.join(tool, dir);

    // Remove existing link or directory if it exists
    try {
      fs.rmSync(link, { recursive: true, force: true });
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.log(`Warning: could not remove ${link}: ${err.message}`);
      }
    }

    try {
      // Use 'junction' for directory symlinks on Windows. 
      // Junctions do not require Administrator privileges unlike true symlinks on Windows.
      fs.symlinkSync(target, link, 'junction');
      console.log(`Linked ${link} -> ${target}`);
    } catch (err) {
      console.error(`Failed to link ${link} -> ${target}:`, err.message);
    }
  }
}

console.log("Symlink setup complete.");
