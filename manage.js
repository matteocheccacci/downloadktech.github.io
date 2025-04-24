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

async function showProjects() {
    const listPath = path.join(__dirname, 'js', 'list.js');
    let listData = fs.readFileSync(listPath, 'utf8');
    const listMatch = listData.match(/\[\s*([\s\S]*?)\s*\]/);

    if (!listMatch) {
        console.log('❌ Errore nel formato di list.js');
        return;
    }

    let entries = listMatch[1].trim().split(',\n').map(e => e.trim()).filter(e => e !== '');

    if (entries.length === 0) {
        console.log('Nessun progetto presente.');
        return;
    }

    console.log('Elenco Progetti:');
    entries.forEach(entry => {
        // Estrai il nome del progetto da ogni entry
        const nameMatch = entry.match(/name: "([^"]+)"/);
        const titleMatch = entry.match(/title: "([^"]+)"/);
        const directoryNameMatch = entry.match(/directoryName: "([^"]+)"/);

        if (nameMatch) {
            const projectName = nameMatch[1];
            const projectTitle = titleMatch ? titleMatch[1] : projectName;
            const directoryName = directoryNameMatch ? directoryNameMatch[1] : projectName;
            console.log(`- ${projectTitle} - ${directoryName}`);
        }
    });
}


async function addProject() {
  const name = await ask('Nome progetto (es. mio_sito_web): ');
  const title = await ask('Titolo visualizzato (es. Il Mio Sito Web): ');
  const description = await ask('Descrizione (es. Un sito web interattivo...): ');
  const version = await ask('Versione (es. 1.2.3): ');
  const size = await ask('Dimensione (es. 5.7 MB): ');
  const downloadLink = await ask('Link download: ');
  const icon = await ask('Percorso icona (es. /img/progetti/msw_icon.png): ');
  const video = await ask('Nome file video (es. anteprima.mp4): ');
  const authors = await ask('Autori (es. Mario Rossi, Luigi Verdi): ');

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
  let listData = fs.readFileSync(listPath, 'utf8');

  const newEntry = `  {
    name: "${title}",
    directoryName: "${name}",
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

  let entries = listMatch[1].trim().split(',\n').map(e => e.trim()).filter(e => e !== '');
  // Rimuovi voci duplicati
  entries = entries.filter(entry => !entry.includes(`directoryName: "${name}"`));
  if (entries.length > 0) {
    entries.push(newEntry);
  } else {
    entries = [newEntry];
  }


  // Scrivi la lista aggiornata nel formato corretto
  const updatedList = `const projectList = [\n${entries.join(',\n')}\n];`;

  fs.writeFileSync(listPath, updatedList);

  console.log(`✅ Progetto "${title}" aggiunto.`);
}

async function modifyProject() {
  const name = await ask('Nome progetto da modificare (es. mio_sito_web): ');

  const projectDir = path.join(__dirname, 'projects', name);
  const jsPath = path.join(projectDir, `${name}.js`);
  const htmlPath = path.join(projectDir, `${name}.html`);

  if (!fs.existsSync(projectDir)) {
    console.log('❌ Progetto non esiste.');
    rl.close();
    return;
  }

  const title = await ask('Nuovo titolo (es. Il Mio Sito Web): ');
  const description = await ask('Nuova descrizione (es. Un sito web interattivo...): ');
  const version = await ask('Nuova versione (es. 1.2.3): ');
  const size = await ask('Nuova dimensione (es. 5.7 MB): ');
  const downloadLink = await ask('Nuovo link (es. https://example.com/download): ');
  const icon = await ask('Nuovo percorso icona (es. /img/progetti/msw_icon.png): ');
  const video = await ask('Nuovo file video (es. anteprima.mp4): ');
    const authors = await ask('Nuovi autori (es. Mario Rossi, Luigi Verdi): ');

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
  let listData = fs.readFileSync(listPath, 'utf8');

  const listMatch = listData.match(/\[\s*([\s\S]*?)\s*\]/);

  if (!listMatch) {
    console.log('❌ Errore nel formato di list.js');
    return;
  }

  let entries = listMatch[1].trim().split(',\n').map(e => e.trim()).filter(e => e !== '');
  entries = entries.filter(entry => !entry.includes(`directoryName: "${name}"`));
  const newEntry = `  {
    name: "${title}",
    directoryName: "${name}",
    icon: "${icon}",
    zip: "${downloadLink}",
    info: "https://downloads.kekkotech.com/projects/${name}/${name}.html"
  }`;
  if (entries.length > 0) {
    entries.push(newEntry);
  } else {
    entries = [newEntry];
  }

  const updatedList = `const projectList = [\n${entries.join(',\n')}\n];`;

  fs.writeFileSync(listPath, updatedList);

  console.log(`✅ Progetto "${title}" modificato.`);
}

async function removeProject() {
  const name = await ask('Nome progetto da rimuovere (es. mio_sito_web): ');

  const projectDir = path.join(__dirname, 'projects', name);
  const jsPath = path.join(projectDir, `${name}.js`);
  const htmlPath = path.join(projectDir, `${name}.html`);

  if (!fs.existsSync(projectDir)) {
    console.log('❌ Progetto non esiste.');
    rl.close();
    return;
  }

  // Rimuovi il progetto
  fs.rmSync(projectDir, { recursive: true, force: true });

  // Rimuovi anche il progetto dalla lista
  const listPath = path.join(__dirname, 'js', 'list.js');
  let listData = fs.readFileSync(listPath, 'utf8');

  const listMatch = listData.match(/\[\s*([\s\S]*?)\s*\]/);

  if (!listMatch) {
    console.log('❌ Errore nel formato di list.js');
    return;
  }

  let entries = listMatch[1].trim().split(',\n').map(e => e.trim()).filter(e => e !== '');
  entries = entries.filter(entry => !entry.includes(`directoryName: "${name}"`)); // Usa directoryName

  const updatedList = `const projectList = [\n${entries.join(',\n')}\n];`;

  fs.writeFileSync(listPath, updatedList);

  console.log(`✅ Progetto "${name}" rimosso.`);
}

async function run() {
    await showProjects();
  const action = await ask('Cosa vuoi fare? (add, modify, remove): ');

  if (action === 'add') {
    await addProject();
  } else if (action === 'modify') {
    await modifyProject();
  } else if (action === 'remove') {
    await removeProject();
  } else {
    console.log('❌ Azione non valida.');
  }

  rl.close();
}

run();
