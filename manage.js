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
        for (const project of projectList) {
            const projectName = project.name;
            const directoryName = project.directoryName || '';
            const greenTitle = `\x1b[32m${projectName}\x1b[0m`;
            const blueDirectory = directoryName ? `\x1b[34m${directoryName}\x1b[0m` : '';
            console.log(`- ${greenTitle} - ${blueDirectory}`);
        }


    } catch (error) {
        console.error('Errore nella lettura o parsing di list.js:', error);
    }
}

async function generateProjectHTML(projectData) {
    const projectDir = path.join(__dirname, 'projects', projectData.directoryName);
    const htmlPath = path.join(projectDir, `${projectData.directoryName}.html`);
    const videoPath = projectData.video ? path.join(projectDir, projectData.video) : ''; // Costruisci il percorso del video
    const iconPath = projectData.icon ? path.join(projectDir, projectData.icon) : ''; // Costruisci il percorso dell'icona

    if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
    }

    // Costruisci la stringa HTML con i dati del progetto
    const htmlContent = `<!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title id="project-title">${projectData.name} | kekkotech</title>
        <style>
          body {
            background-color: #000;
            color: #0f0;
            font-family: Consolas, monospace;
            padding: 20px;
          }
          .terminal {
            max-width: 800px;
            margin: auto;
            border: 1px solid #0f0;
            padding: 20px;
            box-shadow: 0 0 10px #0f0;
          }
          .project-header {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .project-header img {
            width: 64px;
            height: 64px;
          }
          .btn {
            display: inline-block;
            margin-top: 20px;
            padding: 10px 20px;
            background: #000;
            color: #0f0;
            border: 1px solid #0f0;
            border-radius: 4px;
            text-decoration: none;
            font-family: Consolas, monospace;
          }
          .btn:hover {
            background: #003300;
          }
          video {
            width: 100%;
            margin-top: 20px;
          }
          .description {
            margin-top: 20px;
            font-size: 16px;
            white-space: pre-wrap;
          }
          .section {
            margin-top: 20px;
          }
        </style>
    </head>
    <body>
        <div class="terminal">
            <div class="project-header">
                <img id="project-icon" src="${iconPath}" alt="Icona Progetto">
                <h1 id="project-name">${projectData.name}</h1>
            </div>
            <p><strong>Autori:</strong> <span id="project-authors">${projectData.authors}</span></p>
            <p><strong>Versione:</strong> <span id="project-version">${projectData.version}</span></p>
            <p><strong>Dimensione:</strong> <span id="project-size">${projectData.size}</span></p>
            <div class="description" id="project-description">${projectData.description}</div>
            <a id="download-link" class="btn" href="${projectData.zip}">Scarica</a>
            ${projectData.video ? `<video id="project-video" controls>
                <source src="${videoPath}" type="video/mp4">
                Il tuo browser non supporta il tag video.
            </video>` : ''}
            <div class="section">
                <a href="https://kekkotech.com" class="btn" target="_blank">Vai a kekkotech.com</a>
                <a href="https://downloads.kekkotech.com" class="btn" target="_blank">Vai al Download Center</a>
            </div>
        </div>
        <script>
           //No script needed here, the data is already in the HTML
        </script>
    </body>
    </html>
    `;

    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`✅ Pagina HTML del progetto generata in: ${htmlPath}`);
}


async function addProject() {
    const name = await ask('Nome progetto (es. mio_sito_web): ');
    const title = await ask('Titolo visualizzato (es. Il Mio Sito Web): ');
    const description = await ask('Descrizione (es. Un sito web interattivo...): ');
    const version = await ask('Versione (es. 1.2.3): ');
    const size = await ask('Dimensione (es. 5.7 MB): ');
    const downloadLink = await ask('Link download: ');
    const icon = await ask('Nome file icona (es. icon.png): '); // Chiedi solo il nome del file icona
    const video = await ask('Nome file video (es. anteprima.mp4): '); // Chiedi solo il nome del file video
    const authors = await ask('Autori (es. Mario Rossi, Luigi Verdi): ');

    const projectDir = path.join(__dirname, 'projects', name);
    const htmlPath = path.join(projectDir, `${name}.html`);
    const jsPath = path.join(projectDir, `${name}.js`);



    if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
    }

    // Contenuto JS - Non più necessario, inseriamo direttamente nell'HTML
    const jsContent = `const projectData = {
    title: "${title}",
    description: "${description}",
    version: "${version}",
    size: "${size}",
    downloadLink: "${downloadLink}",
    icon: "${icon}",
    video: "${video}",
    authors: "${authors}"
  };`;
    fs.writeFileSync(jsPath, jsContent);


    // Aggiorna list.js
    const listPath = path.join(__dirname, 'js', 'list.js');
    try {
        let listData = fs.readFileSync(listPath, 'utf8');
        let projectList = [];
        // Extract the array part
        const arrayContent = listData.substring(listData.indexOf('['), listData.lastIndexOf(']') + 1);
        if (arrayContent) {
            try {
                projectList = JSON.parse(arrayContent);
            } catch (e) {
                projectList = [];
            }
        }

        const newEntry = {
            name: title,
            directoryName: name,
            icon: icon, // Salva solo il nome del file icona
            zip: downloadLink,
            info: `https://downloads.kekkotech.com/projects/${name}/${name}.html`,
            authors: authors,
            version: version,
            size: size,
            description: description,
            video: video // Salva solo il nome del file video
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
    //genera html
    await generateProjectHTML(
        {
            name: title,
            directoryName: name,
            icon: icon,
            zip: downloadLink,
            info: `https://downloads.kekkotech.com/projects/${name}/${name}.html`,
            authors: authors,
            version: version,
            size: size,
            description: description,
            video: video
        }
    );

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
    const downloadLink = await ask('Link Download: '); // Modifica qui
    const icon = await ask('Nuovo nome file icona (es. icon.png): '); // Chiedi solo il nome del file icona
    const video = await ask('Nuovo nome file video (es. anteprima.mp4): '); // Chiedi solo il nome del file video
    const authors = await ask('Nuovi autori (es. Mario Rossi, Luigi Verdi): ');

    // Contenuto JS - non piu usato
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


    // Aggiorna list.js
    const listPath = path.join(__dirname, 'js', 'list.js');
    try {
        let listData = fs.readFileSync(listPath, 'utf8');
        let projectList = [];
        // Extract the array part
        const arrayContent = listData.substring(listData.indexOf('['), listData.lastIndexOf(']') + 1);
        if (arrayContent) {
            try {
                projectList = JSON.parse(arrayContent);
            } catch (e) {
                projectList = [];
            }
        }

        const updatedEntry = {
            name: title,
            directoryName: name,
            icon: icon, // Salva solo il nome del file icona
            zip: downloadLink,
            info: `https://downloads.kekkotech.com/projects/${name}/${name}.html`,
            authors: authors,
            version: version, // Salva solo il nome del file video
            size: size,
            description: description,
            video: video
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
    //genera la pagina html
    await generateProjectHTML(
        {
            name: title,
            directoryName: name,
            icon: icon,
            zip: downloadLink,
            info: `https://downloads.kekkotech.com/projects/${name}/${name}.html`,
            authors: authors,
            version: version,
            size: size,
            description: description,
            video: video
        }
    );
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
        if (arrayContent) {
            try {
                projectList = JSON.parse(arrayContent);
            } catch (e) {
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
