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
            let updatedEmployees = [...employees];
            let hasGlobalChanges = false;

            // ORDINE E IMPORTI FORNITI DALL'UTENTE IN AUDIO E TESTO
            const costantinoRates = [
                { n: 'via Don Sturzo 10', rate: 100 },
                { n: 'via Don Sturzo 6', rate: 50 },
                { n: 'via Corridoni 18', rate: 40 },
                { n: 'via Don Milani 2/4', rate: 40 },
                { n: 'via Leonardo da vinci 39', rate: 40 },
                { n: 'via Filzi', rate: 40 },
                { n: 'via Mincio', rate: 120 },
                { n: 'via Balconi', rate: 40 },
                { n: 'via Fatebenefratelli 21A', rate: 40 },
                { n: 'via Videmari 3', rate: 50 },
                { n: 'via Marconi 15', rate: 40 },
                { n: 'via Dante 32', rate: 40 },
                { n: 'via Naviglio 4', rate: 40 },
                { n: 'via Cadore 46', rate: 40 },
                { n: 'via Penati 8', rate: 40 },
                { n: 'via Grossi 11', rate: 40 },
                { n: 'via Visconti 20', rate: 40 },
                { n: 'via Montegrappa 10', rate: 40 },
                { n: 'via Oberdan 6/8', rate: 100 },
                { n: 'via Vespucci 38', rate: 40 },
                { n: 'via Colombo 1', rate: 80 },
                { n: 'via Colombo 19', rate: 40 },
                { n: 'via Buonarroti 16', rate: 40 },
                { n: 'via Buonarroti 28', rate: 40 },
                { n: 'via Buonarroti 33', rate: 40 },
                { n: 'via Adua 26', rate: 50 },
                { n: 'via Adua 30', rate: 40 },
                { n: 'via D\'Annunzio 3', rate: 40 },
                { n: 'via Tolmezzo 10', rate: 40 }
            ];

            // CERCHIAMO COSTANTINO
            let costantinoIndex = updatedEmployees.findIndex(
                e => (e.firstName.toLowerCase().includes('costan') || e.lastName.toLowerCase().includes('costan'))
            );

            if (costantinoIndex !== -1) {
                const emp = { ...updatedEmployees[costantinoIndex] };
                const currentAssignments: any[] = emp.defaultAssignments ? [...emp.defaultAssignments] : [];

                // Per ogni entry nello schedule, guardiamo il SiteId e cerchiamo il nome in "sites" per matcharlo all'array rate 
                currentAssignments.forEach(assignment => {
                    const matchedSite = sites.find(s => s.id === assignment.siteId);
                    if (matchedSite) {
                        // Cerchiamo il nome o parte del nome nella roba di costantinoRate
                        const rateConfig = costantinoRates.find(cr =>
                            matchedSite.name.toLowerCase().includes(cr.n.toLowerCase().trim()) ||
                            cr.n.toLowerCase().trim().includes(matchedSite.name.toLowerCase().trim())
                        );

                        if (rateConfig) {
                            assignment.type = 'FORFAIT';
                            // IL BUG ERA QUI! La key in types.ts si chiama forfaitAmount, NON monthlyRate!
                            assignment.forfaitAmount = rateConfig.rate;
                            // clean out any incorrect props if any exist (like monthlyRate if dynamic JS allowed it)
                            if ('monthlyRate' in assignment) { delete (assignment as any).monthlyRate; }

                            hasGlobalChanges = true;
                        }
                    }
                });

                emp.defaultAssignments = currentAssignments;
                updatedEmployees[costantinoIndex] = emp;
            }

            if (hasGlobalChanges) {
                setEmployees(updatedEmployees);
                console.log("Agent: Forfait Costantino ineriti completati con nome variabile corretta.");
                setTimeout(() => {
                    alert(`🤖 Agente AI: IMPORTI FORFAIT CORRETTI! ✅\n\nEra stato usato un nome di campo errato nello script precedente. Ora i forfait in euro sono visibili nell'app.`);
                }, 800);
            } else {
                alert("🤖 Agente AI: non ho trovato importi da modificare.");
                setDone(true);
            }

            setDone(true);
        }, 2000);

        return () => clearTimeout(t);

    }, [employees, sites, setEmployees, setSites, done]);

    return null;
};
