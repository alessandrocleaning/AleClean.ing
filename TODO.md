1. Audit e Incongruenze Rilevate
- [x] Dimensioni File: MonthlySheet.tsx ha superato le 2200 righe. Contiene troppa logica mista (UI, Calcoli PDF, Gestione Stato). Sarebbe opportuno estrarre la logica di calcolo in utils/ o services/.
- [x] LocalStorage vs Firestore: È presente una logica di migrazione in useFirestoreData.ts. Alcuni dati (come il saldoCassa in Dashboard) sono ora salvati su Firestore, garantendo la sincronizzazione tra diversi dispositivi.
- [x] Componenti di Debug: AgentDataInjector.tsx è stato rimosso per garantire la pulizia e la sicurezza in produzione.
- [x] Discrepanza Costi: Dashboard e Analisi Costi ora usano la stessa formula: 15€/ora per le ore da contratto e l'hourlyRate reale per le ore extra.
- [x] Regola Linguistica Agenti: Implementata persistenza per la risposta obbligatoria in italiano tramite .cursorrules, MASTER.md e AGENT_INSTRUCTIONS.md.
- [x] Ordinamento Dipendenti: Rimosso l'ordinamento alfabetico forzato in Generatore Mensile per riflettere l'ordine personalizzato della sezione Dipendenti.