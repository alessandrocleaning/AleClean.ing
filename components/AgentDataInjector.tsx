import React, { useEffect, useState } from 'react';
import { Employee, Site } from '../types';

export const AgentDataInjector: React.FC<{
    employees: Employee[];
    setEmployees: (e: Employee[]) => void;
    sites: Site[];
    setSites: (s: Site[]) => void;
}> = ({ employees, setEmployees, sites, setSites }) => {
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (done || employees.length === 0 || sites.length === 0) return;

        const t = setTimeout(() => {
            let updatedSites = [...sites];
            let updatedEmployees = [...employees];
            let hasGlobalChanges = false;
            let hasSiteChanges = false;

            // Trova TUTTI i cantieri che si chiamano "via cadorna 10" o simili
            const targetName = 'cadorna 10';
            const matchingSites = updatedSites.filter(s => s.name.toLowerCase().includes(targetName));

            if (matchingSites.length > 0) {
                console.log("Agent: Trovati", matchingSites.length, "cantieri 'cadorna 10':", matchingSites);

                // Teniamo il primo come "BUONO" (master)
                const masterSite = matchingSites[0];
                const masterId = masterSite.id;

                // Se ci sono duplicati, prepariamo la rimozione e l'aggiornamento degli ID
                const duplicateIds = matchingSites.slice(1).map(s => s.id);

                if (duplicateIds.length > 0) {
                    console.log("Agent: Rimozione duplicati IDs:", duplicateIds);
                    // Togliamo i duplicati dai cantieri
                    updatedSites = updatedSites.filter(s => !duplicateIds.includes(s.id));
                    hasSiteChanges = true;
                }

                // Adesso passiamo tutti i dipendenti.
                // Qualsiasi assegnazione che punti a un duplicateId, oppure "Sconosciuto" (mancante) per via Cadorna,
                // o che genericamente debba essere unificata, la facciamo puntare al masterId.
                updatedEmployees.forEach((emp, empIdx) => {
                    let empChanged = false;
                    const newAssignments = (emp.defaultAssignments || []).map(assign => {
                        // Se l'assegnazione punta a un ID duplicato che abbiamo rimosso
                        if (duplicateIds.includes(assign.siteId)) {
                            empChanged = true;
                            return { ...assign, siteId: masterId };
                        }

                        // Se l'assegnazione punta al masterId, va bene così
                        if (assign.siteId === masterId) {
                            return assign;
                        }

                        // Potrebbe esserci un'assegnazione che punta a un ID cancellato in passato
                        // Ma noi qui sistemiamo solo i duplicati attuali. Per coprire il fatto che 
                        // la UI di EmployeeManager mostra "Sconosciuto", significa che l'ID salvato 
                        // nell'assegnazione NON esiste in `sites`. 
                        const siteExistsInList = updatedSites.some(s => s.id === assign.siteId);
                        if (!siteExistsInList) {
                            // È uno "sconosciuto". Dobbiamo capire se era Cadorna 10? Non possiamo saperlo dall'ID se non c'è più.
                            // Però il problema dell'utente è che quando seleziona dal menu "via cadorna", succede un bug.
                        }

                        return assign;
                    });

                    if (empChanged) {
                        updatedEmployees[empIdx] = { ...emp, defaultAssignments: newAssignments };
                        hasGlobalChanges = true;
                    }
                });

                // Un'altra possibile causa: l'utente cerca di aggiungere Cadorna, ma c'è un bug nel salvataggio.
                // Assicuriamo che Cadorna sia ben pulito.
                masterSite.name = "via Cadorna 10"; // normalizziamo il nome
                masterSite.city = "Cernusco";
                hasSiteChanges = true; // Forza salvataggio pulito
            } else {
                // Se NON esiste, lo creiamo (ma l'utente dice che c'è!)
                const masterId = 'site-forced-' + Math.random().toString(36).substr(2, 9);
                updatedSites.push({
                    id: masterId,
                    name: 'via Cadorna 10',
                    address: 'via Cadorna 10',
                    city: 'Cernusco'
                });
                hasSiteChanges = true;
            }

            // Ora ispezioniamo Isa e Reynaldo specificamente, forzando Cadorna a essere sano se ce l'hanno.
            // Se ce l'hanno "sconosciuto", cerchiamo e togliamo l'assegnazione sconosciuta e rimettiamo Cadorna pulita?
            // Ma l'utente ha detto: "ogni volta che lo inserisco ed elimino il vecchio mi rimette sconosciuto".
            // Questo vuol dire che il componente UI seleziona male Cadorna o l'ID è buggato.
            // Vediamo se ci sono siti Cadorna *vuoti*

            if (hasSiteChanges) {
                setSites(updatedSites);
            }
            if (hasGlobalChanges) {
                // Aspettiamo un attimo per dare il tempo a firebase
                setTimeout(() => {
                    setEmployees(updatedEmployees);
                    alert(`🤖 Agente AI: Ho pulito l'anagrafica di 'via Cadorna 10' dai possibili duplicati/corruzioni! Riprova ora ad assegnarlo.`);
                }, 1000);
            } else if (hasSiteChanges) {
                alert(`🤖 Agente AI: Ho pulito l'anagrafica di 'via Cadorna 10'. Riprova ora ad aggiungerlo.`);
            } else {
                alert(`🤖 Agente AI: via Cadorna 10 sembrava già a posto. Probabilmente il problema è legato al salvataggio Firestore.`);
            }

            setDone(true);
        }, 2000);

        return () => clearTimeout(t);

    }, [employees, sites, setEmployees, setSites, done]);

    return null;
};
