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
  try {
    const listData = fs.readFileSync(listPath, 'utf8');
    const projectList = JSON.parse(listData.substring(listData.indexOf('['), listData.lastIndexOf(']') + 1));


    if (!Array.isArray(projectList) || projectList.length === 0) {
      console.log('Nessun progetto presente o formato non valido.');
      return;
    }

    console.log('Elenco Progetti:');
    projectList.forEach(project => {
      const projectName = project.name;
      const directoryName = project.directoryName || '';
      const greenTitle = `\x1b[32m${projectName}\x1b[0m`;
      const blueDirectory = directoryName ? `\x1b[34m${directoryName}\x1b[0m` : '';
      console.log(`- ${greenTitle} - ${blueDirectory}`);
    });
  } catch (error) {
    console.error('Errore nella lettura o parsing di list.js:', error);
  }
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
  try {
    let listData = fs.readFileSync(listPath, 'utf8');
    let projectList = [];
    // Extract the array part
    const arrayContent = listData.substring(listData.indexOf('['), listData.lastIndexOf(']') + 1);
    if(arrayContent){
      try{
        projectList = JSON.parse(arrayContent);
      }catch(e){
        projectList = [];
      }
    }

    const newEntry = {
      name: title,
      directoryName: name,
      icon: icon,
      zip: downloadLink,
      info: `https://downloads.kekkotech.com/projects/${name}/${name}.html`
    };

    // Check for duplicates
    const duplicate = projectList.find(p => p.directoryName === name);
    if (!duplicate) {
      projectList.push(newEntry);
    }

    const updatedList = `const projectList = ${JSON.stringify(projectList, null, 2)};`; //pretty print
    fs.writeFileSync(listPath, updatedList);

    console.log(`✅ Progetto "${title}" aggiunto.`);
  } catch (error) {
    console.error('Errore nell\'aggiornamento di list.js:', error);
  }
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
  try {
    let listData = fs.readFileSync(listPath, 'utf8');
      let projectList = [];
    // Extract the array part
    const arrayContent = listData.substring(listData.indexOf('['), listData.lastIndexOf(']') + 1);
    if(arrayContent){
      try{
         projectList = JSON.parse(arrayContent);
      }catch(e){
        projectList = [];
      }
    }


    const updatedEntry = {
      name: title,
      directoryName: name,
      icon: icon,
      zip: downloadLink,
      info: `https://downloads.kekkotech.com/projects/${name}/${name}.html`
    };

    // Find and update
    const index = projectList.findIndex(p => p.directoryName === name);
    if (index !== -1) {
      projectList[index] = updatedEntry;
    } else {
      projectList.push(updatedEntry); // Add if not found
    }

    const updatedList = `const projectList = ${JSON.stringify(projectList, null, 2)};`;
    fs.writeFileSync(listPath, updatedList);

    console.log(`✅ Progetto "${title}" modificato.`);
  } catch (error) {
    console.error('Errore nella modifica di list.js:', error);
  }
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

  // Aggiorna list.js
  const listPath = path.join(__dirname, 'js', 'list.js');
  try {
    let listData = fs.readFileSync(listPath, 'utf8');
    let projectList = [];
    // Extract the array part
    const arrayContent = listData.substring(listData.indexOf('['), listData.lastIndexOf(']') + 1);
      if(arrayContent){
      try{
         projectList = JSON.parse(arrayContent);
      }catch(e){
        projectList = [];
      }
    }

    // Remove the project
    const updatedList = projectList.filter(p => p.directoryName !== name);
    const updatedListContent = `const projectList = ${JSON.stringify(updatedList, null, 2)};`;
    fs.writeFileSync(listPath, updatedListContent);

    console.log(`✅ Progetto "${name}" rimosso.`);
  } catch (error) {
    console.error('Errore nella rimozione del progetto da list.js:', error);
  }
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
