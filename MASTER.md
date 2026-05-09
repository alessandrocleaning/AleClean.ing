📂 File Master: Documento di Architettura "CLEAN.ING Manager"

1. Scopo del Progetto
CLEAN.ING Manager è una Single Page Application (SPA) avanzata progettata per la gestione operativa e finanziaria di un'impresa di pulizie. Il sistema centralizza la gestione dei dipendenti, dei cantieri e delle presenze mensili, automatizzando il calcolo dei costi del personale, dei rimborsi spese e l'analisi dei margini di profitto. L'obiettivo principale è trasformare i dati operativi (ore lavorate) in informazioni finanziarie strategiche (KPI di margine e reportistica per cedolini).

2. Modello Dati
La struttura dati è definita in types.ts e si articola su quattro entità principali:

Site (Cantiere):
Identificato da nome, indirizzo e categoria (Condominio, Azienda, etc.).
Include il netMonthlyRevenue (Fatturato Mensile Netto), parametro chiave per il calcolo dei margini.
Employee (Dipendente):
Contiene dati anagrafici, hourlyRate (paga oraria) e targetSalary.
Possiede una splitConfig per la gestione automatizzata dei rimborsi (Trasferta, Benzina, Spese).
Include la gestione contrattuale (tipo di contratto e date di inizio/fine).
Assignment (Assegnazione):
Collega un dipendente a un cantiere con un piano di lavoro settimanale (schedule).
Supporta modalità HOURLY (a ore) o FORFAIT (fisso mensile).
Gestisce ricorrenze complesse (es. settimanale, ogni X settimane, o solo in specifiche settimane del mese).
MonthlyData (Dati Mensili):
Un "bucket" che memorizza per ogni mese: override delle ore lavorate (AttendanceRecord), note, lavori extra (ExtraJob) e configurazioni di split specifiche per il mese.

3. Funzionalità Sviluppate
Il progetto è suddiviso in sei sezioni principali gestite tramite un ViewMode:

Dashboard: Visualizzazione dei KPI "Executive" (Fatturato totale, Costo personale stimato, Margine Lordo %, Efficienza economica). Include grafici Recharts per la distribuzione geografica dei cantieri.
Il Tuo Team (Employees): Gestione anagrafica e configuratore avanzato dei piani di lavoro. Permette l'archiviazione di assegnazioni terminate per mantenere lo storico.
Gestione Cantieri (Sites): Database dei luoghi di lavoro con i relativi parametri economici.
Generatore Mensile (Monthly Sheet): L'anima operativa dell'app. Un foglio presenze interattivo con:
Toolbox Presenze: Inserimento rapido di Ferie, Malattia, Permessi, Straordinari.
Calcolatore Orari: Modalità per inserire orari di entrata/uscita e calcolare automaticamente le ore nette (sottraendo le pause).
Gestione Extra: Aggiunta di lavori una-tantum o rimborsi spese.
Analisi Costi: Reportistica dettagliata che confronta i ricavi di ogni cantiere con i costi reali del personale assegnato, evidenziando la profittabilità di ogni singolo appalto.
Cedolini (Allowances): Tabella riassuntiva per il back-office/commercialista con il totale delle competenze mensili, rimborsi e codici PUC per la malattia.

4. Logiche e Regole Aziendali
Calcolo Costi (Dashboard): Utilizza una formula standard di ore settimanali * 4.33 (media settimane mese) * 16€ (costo orario medio) per le stime rapide.
Regole di Ricorrenza: Le assegnazioni possono essere filtrate per settimana (es. "solo la 1ª e la 3ª settimana del mese"). L'app calcola dinamicamente quali giorni mostrare nel foglio presenze in base a queste regole.
Logica di Split (Rimborsi):
FIXED: Importo fisso.
PERCENT: Percentuale sul totale rimborsi.
REMAINDER: Calcola automaticamente la differenza per chiudere il totale (es. se Trasferta è 100€ e Benzina è Remainder, e il totale è 150€, Benzina sarà 50€).
Gestione Festività: Include un holidayService che calcola dinamicamente le festività italiane (inclusa la Pasqua tramite algoritmo di Gauss) per evidenziare i giorni festivi nel calendario.
Chiusura Contratti: Se un dipendente ha una contractEndDate, il sistema lo esclude automaticamente dai calcoli e dalle visualizzazioni a partire dal mese successivo alla scadenza.

5. Stack Tecnologico e Librerie
Core: React 19 (App Router-like pattern manuale), Vite, TypeScript.
Backend & Persistence: Firebase (Firestore per i dati, Authentication per l'accesso).
Styling: Tailwind CSS con animazioni personalizzate e Lucide-React per l'iconografia premium.
Data Vis: Recharts per i grafici statistici in Dashboard.
Date Management: date-fns (esteso utilizzo per manipolazione di mesi e settimane).
Export: jsPDF e jspdf-autotable per la generazione di report PDF dei fogli ore.

6. Linee Guida per gli Agenti AI
Per mantenere la coerenza con le preferenze dell'utente:
- Tutte le interazioni e le risposte devono essere in lingua ITALIANA.
- La documentazione interna e i piani di lavoro devono essere redatti in ITALIANO.