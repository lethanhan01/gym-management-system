const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
let count = 0;
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // Specifically look for import { toast } from 'sonner'
  // Handle single and double quotes, and possible other imports on the same line if any.
  // Actually, standard is `import { toast } from 'sonner'`
  // Let's use a regex
  const regex = /import\s*\{\s*toast\s*\}\s*from\s*['"]sonner['"]/g;
  if (regex.test(content)) {
    const updated = content.replace(regex, "import { toast } from '@/lib/toast'");
    fs.writeFileSync(file, updated);
    count++;
    console.log(`Updated ${file}`);
  }
});
console.log(`Updated ${count} files.`);
