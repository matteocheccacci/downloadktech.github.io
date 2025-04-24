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

async function askAction() {
  const action = await ask('Cosa vuoi fare? (aggiungere, modificare, rimuovere): ');
  return action.trim().toLowerCase();
}

async function addProject() {
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

  // Trova il contenuto della lista di progetti
  const listMatch = listData.match(/\[\s*([\s\S]*?)\s*\]/);

  if (!listMatch) {
    console.log('❌ Errore nel formato di list.js');
    return;
  }

  let entries = listMatch[1].trim().split('\n').map(e => e.trim()).filter(e => e !== '');
  // Rimuovi voci duplicati
  entries = entries.filter(entry => !entry.includes(`"${title}"`));
  entries.push(newEntry);

  // Scrivi la lista aggiornata nel formato corretto
  const updatedList = `const projectList = [\n${entries.join(',\n')}\n];`;

  fs.writeFileSync(listPath, updatedList);

  console.log(`✅ Progetto "${title}" aggiunto con successo.`);
}

async function modifyProject() {
  const name = await ask('Nome del progetto da modificare (es. autodesigna): ');

  const projectDir = path.join(__dirname, 'projects', name);
  const jsPath = path.join(projectDir, `${name}.js`);
  const htmlPath = path.join(projectDir, `${name}.html`);

  if (!fs.existsSync(projectDir)) {
    console.log('❌ Il progetto non esiste.');
    rl.close();
    return;
  }

  const title = await ask('Nuovo titolo da visualizzare: ');
  const description = await ask('Nuova descrizione: ');
  const version = await ask('Nuova versione: ');
  const size = await ask('Nuova dimensione: ');
  const downloadLink = await ask('Nuovo link per il download: ');
  const icon = await ask('Nuovo percorso icona: ');
  const video = await ask('Nuovo nome file video: ');
  const authors = await ask('Nuovi autori: ');

  // Contenuto JS aggiornato
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

  // Contenuto HTML aggiornato
  const htmlTemplate = fs.readFileSync(path.join(__dirname, 'template_progetto.html'), 'utf8');
  const htmlWithScript = htmlTemplate.replace('SCRIPT_SRC_HERE', `${name}.js`);
  fs.writeFileSync(htmlPath, htmlWithScript);

  // Aggiorna list.js
  const listPath = path.join(__dirname, 'js', 'list.js');
  const listData = fs.readFileSync(listPath, 'utf8');

  const listMatch = listData.match(/\[\s*([\s\S]*?)\s*\]/);

  if (!listMatch) {
    console.log('❌ Errore nel formato di list.js');
    return;
  }

  let entries = listMatch[1].trim().split('\n').map(e => e.trim()).filter(e => e !== '');
  entries = entries.filter(entry => !entry.includes(`"${name}"`));

  entries.push(`  {
    name: "${title}",
    icon: "${icon}",
    zip: "${downloadLink}",
    info: "https://downloads.kekkotech.com/projects/${name}/${name}.html"
  }`);

  const updatedList = `const projectList = [\n${entries.join(',\n')}\n];`;

  fs.writeFileSync(listPath, updatedList);

  console.log(`✅ Progetto "${title}" modificato con successo.`);
}

async function removeProject() {
  const name = await ask('Nome del progetto da rimuovere (es. autodesigna): ');

  const projectDir = path.join(__dirname, 'projects', name);
  const jsPath = path.join(projectDir, `${name}.js`);
  const htmlPath = path.join(projectDir, `${name}.html`);

  if (!fs.existsSync(projectDir)) {
    console.log('❌ Il progetto non esiste.');
    rl.close();
    return;
  }

  // Rimuovi il progetto
  fs.rmSync(projectDir, { recursive: true, force: true });

  // Rimuovi anche il progetto dalla lista
  const listPath = path.join(__dirname, 'js', 'list.js');
  const listData = fs.readFileSync(listPath, 'utf8');

  const listMatch = listData.match(/\[\s*([\s\S]*?)\s*\]/);

  if (!listMatch) {
    console.log('❌ Errore nel formato di list.js');
    return;
  }

  let entries = listMatch[1].trim().split('\n').map(e => e.trim()).filter(e => e !== '');
  entries = entries.filter(line => !line.includes(`"${name}"`));

  const updatedList = `const projectList = [\n${entries.join(',\n')}\n];`;

  fs.writeFileSync(listPath, updatedList);

  console.log(`✅ Progetto "${name}" rimosso con successo.`);
}

async function run() {
  const action = await askAction();

  if (action === 'aggiungere') {
    await addProject();
  } else if (action === 'modificare') {
    await modifyProject();
  } else if (action === 'rimuovere') {
    await removeProject();
  } else {
    console.log('❌ Azione non valida.');
  }

  rl.close();
}

run();
