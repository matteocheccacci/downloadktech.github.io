const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function run() {
  const name = await ask('Nome del progetto (es. autodesigna): ');
  const title = await ask('Titolo da visualizzare: ');
  const description = await ask('Descrizione: ');
  const version = await ask('Versione: ');
  const size = await ask('Dimensione (es. 3.1 MB): ');
  const downloadLink = await ask('Link per il download: ');
  const icon = await ask('Percorso icona (es. /img/progetti/xxx.png): ');
  const video = await ask('Nome file video (es. preview.mp4): ');
  const authors = await ask('Autori: ');

  const projectDir = path.join(__dirname, 'projects', name);
  const htmlPath = path.join(projectDir, `${name}.html`);
  const jsPath = path.join(projectDir, `${name}.js`);

  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }

  // Contenuto JS
  const jsContent = `const projectData = {
  title: "${title}",
  description: "${description}",
  version: "${version}",
  size: "${size}",
  downloadLink: "${downloadLink}",
  icon: "icon.png",
  video: "${video}",
  authors: "${authors}"
};`;

  fs.writeFileSync(jsPath, jsContent);

  // Contenuto HTML
  const htmlTemplate = fs.readFileSync(path.join(__dirname, 'template_progetto.html'), 'utf8');
  const htmlWithScript = htmlTemplate.replace('SCRIPT_SRC_HERE', `${name}.js`);
  fs.writeFileSync(htmlPath, htmlWithScript);

  // Aggiorna list.js
  const listPath = path.join(__dirname, 'js', 'list.js');
  const listData = fs.readFileSync(listPath, 'utf8');
  const newEntry = `  {
    name: "${title}",
    icon: "${icon}",
    zip: "${downloadLink}",
    info: "https://downloads.kekkotech.com/projects/${name}/${name}.html"
  }`;

  const updatedList = listData.replace(/(\[\s*)((.|\s)*?)(\s*\])/, (match, p1, p2, _, p4) => {
    const entries = p2.trim().split('\n').filter(e => e.trim());
    const updated = entries.filter(line => !line.includes(`"${title}"`));
    updated.push(newEntry);
    return `${p1}${updated.join(',\n')}${p4}`;
  });

  fs.writeFileSync(listPath, updatedList);

  console.log(`✅ Progetto "${title}" aggiornato con successo.`);
  rl.close();
}

run();
