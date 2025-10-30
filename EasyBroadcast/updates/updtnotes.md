#### **🆕 Versione 1.2.0**

**Questa versione introduce importanti modifiche strutturali, nuove funzionalità e numerose correzioni di bug per migliorare la stabilità e l'esperienza d'uso.**

##### **✨ Nuove Funzionalità e Miglioramenti**

###### **Gestione Allegati:** 

* **È ora possibile allegare un'immagine (come foto) o un file (come documento) ai tuoi messaggi. Il testo del messaggio verrà utilizzato come didascalia.**
* 
**###### Riorganizzazione Cartelle (Migrazione Automatica):**

* **Per tenere pulita la cartella principale, tutti i file di configurazione (.json), i log (.txt) e le immagini (logo.png) vengono ora salvati in una nuova sottocartella chiamata eb\_data/;**
* **Al primo avvio dopo l'aggiornamento, l'applicazione rileverà i tuoi vecchi file e li sposterà automaticamente nella nuova struttura senza perdita di dati.**
* 
**###### Sistema di Patch Obbligatorie (DayOnePatch):** 

* **L'applicazione ora controlla all'avvio se ci sono aggiornamenti critici. Se presenti, eseguirà un aggiornamento obbligatorio prima di avviarsi.**
* 
**###### Prima Configurazione (OOBE) Migliorata:**

* **La gestione delle categorie è stata integrata direttamente nel flusso di configurazione iniziale (non è più opzionale);**
* **L'ordine dei passaggi è stato corretto per una maggiore logica.**
* 
**###### Aggiornamenti Intelligenti:**

* **Il controllo degli aggiornamenti all'avvio (se attivato) ora è silenzioso. Non mostrerà più un popup se il software è già aggiornato;**
* **Se si modificano l'Update Server o il Service ID nelle Impostazioni, le schede "Info" e "Novità" si aggiornano immediatamente.**
* 
**###### UI Pulita:**

* **I messaggi di errore mostrati all'utente sono ora generici e non espongono più dettagli tecnici o eccezioni;**
* **Le stampe di debug sulla console sono state disabilitate.**
* 
**##### 🐞 Bugfix**

* **Fix Critico OOBE: Risolto un grave crash che si verificava durante la prima configurazione, subito dopo aver chiuso la finestra di gestione delle categorie;**
* **Fix Avvio Applicazione: Risolto un bug per cui l'applicazione rimaneva invisibile (nascosta) dopo l'avvio, specialmente dopo la migrazione;**
* **Fix Logica Migrazione: La migrazione ora si avvia correttamente controllando la presenza di qualsiasi vecchio file di configurazione, non solo config.json, evitando che l'OOBE parta per errore;**
* **Fix Salvataggio Impostazioni: Risolto un NameError che poteva verificarsi durante il salvataggio delle impostazioni a causa di una variabile non definita.**
* 
**#### ---------------------------------------------------------------------------**

#### **Versione 1.1.9**

##### *What's New*

###### Controllo aggiornamenti:

* Aggiunto il controllo aggiornamenti all'avvio (disattivabile dalle impostazioni e durante la configurazione).

###### Sistema di Backup e Ripristino:

* Introdotta la sezione "Backup e Ripristino" nella scheda "Impostazioni";
* Crea Backup: Salva tutte le configurazioni (config.json), le impostazioni (settings.json), le bozze (draft.json) e la cronologia (log.txt) in un unico file .json scelto dall'utente;
* Carica Backup: Ripristina tutti i dati da un file di backup .json precedentemente creato, sovrascrivendo le impostazioni correnti (richiede il riavvio).

###### Gestione Completa delle Categorie:

* Le categorie sono ora completamente personalizzabili e partono da un elenco vuoto;
* È possibile aggiungere, modificare ed eliminare categorie sia durante la prima configurazione sia dalla nuova scheda "Categorie" nelle Impostazioni;
* Le categorie personalizzate vengono salvate nel file settings.json.

###### Gestione Cronologia:

* Aggiunto il pulsante "Pulisci Cronologia" nella scheda "Cronologia" per eliminare tutti i messaggi registrati nel file log.txt.

###### Gestione Contenuti Migliorata:

* Aggiunta la funzionalità "Modifica" per Firme ed Emoji nella scheda "Impostazioni", permettendo di aggiornare i valori esistenti senza doverli rimuovere e ricreare;
* Miglioramenti UI (Interfaccia Utente).

###### Riorganizzazione Scheda Impostazioni:

* La scheda "Impostazioni" è stata completamente ridisegnata, passando da un lungo elenco a una griglia 2x2 più pulita e organizzata;
* Le impostazioni sono ora raggruppate in Sezioni (Bot e Chat, Connessione, Contenuti, Backup);
* Le liste di Firme, Emoji e Categorie sono state spostate in un Notebook (pannelli a schede) all'interno del gruppo "Contenuti";
* Semplificato il testo dei pulsanti di gestione (Chat, Firme, Emoji, Categorie), utilizzando solo "Aggiungi", "Modifica" e "Rimuovi".

###### Miglioramenti Configurazione Iniziale:

* Rimosso il termine "OOBE" (Out-of-Box Experience) dal titolo della finestra di configurazione iniziale delle categorie, rendendolo più intuitivo ("Gestione Categorie");
* Correzioni di Bug e Logica.

###### Gestione Firma "Nessuna":

* Selezionando "Nessuna" dal menu a tendina delle firme, il messaggio viene ora inviato correttamente senza alcuna firma, come previsto.

###### Gestione Categoria "Nessuna":

* La selezione della categoria non è più obbligatoria. È stata aggiunta l'opzione "Nessuna" come predefinita nel menu a tendina della scheda "Messaggi".



##### *Known Issues*

* Se il programma è offline è possibile riscontrare alcuni errori di visualizzazione.

#### **---------------------------------------------------------------------------**

#### **Versione 1.1.8**

##### *What's New*

* Aggiunta la configurazione al primo avvio;
* Modificato il branding del software;
* Modificato il nome del software in EasyBroadcast;
* Modificata la modalità di gestione delle note di update.

#### **---------------------------------------------------------------------------**

