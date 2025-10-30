#### **Versione 1.2.0 🆕**

#### **---------------------------------------------------------------------------**

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

