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
        if (done || sites.length === 0) return;

        const t = setTimeout(() => {
            let updatedSites = [...sites];
            let matchedCount = 0;

            const extractedData = [
                { "via": "Via Fatebenefratelli 21", "imponibile": 356.27 },
                { "via": "Via Colombo 1", "imponibile": 701.99 },
                { "via": "Via Don Milani 2/4", "imponibile": 730 },
                { "via": "Via Penati 8", "imponibile": 300 },
                { "via": "Via Don Sturzo 10", "imponibile": 1232.97 },
                { "via": "Via Balconi 31/37/43", "imponibile": 330 },
                { "via": "Via Vespucci 17/21", "imponibile": 1000 },
                { "via": "Via Don Sturzo 2/6/10", "imponibile": 0 },
                { "via": "Via Nilde Iotti 16", "imponibile": 800 },
                { "via": "Via Don Sturzo 6 G/H", "imponibile": 600 },
                { "via": "Via Torrente Molgora 1", "imponibile": 500 },
                { "via": "Via Giusti 28", "imponibile": 1500 },
                { "via": "Via Wagner 4/A", "imponibile": 370 },
                { "via": "Via XXV Aprile 27A", "imponibile": 280 },
                { "via": "Via Pier Della Francesca 4", "imponibile": 645.05 },
                { "via": "Via Milano 39", "imponibile": 108 },
                { "via": "Via Largo Riboldi 4", "imponibile": 218 },
                { "via": "Via De Gasperi 10 - Turati 1", "imponibile": 1550 },
                { "via": "Via Tiepolo 4", "imponibile": 655 },
                { "via": "Via Roma 13/15", "imponibile": 312 },
                { "via": "Via Milano 2A", "imponibile": 900 },
                { "via": "via Firenze 16", "imponibile": 200 },
                { "via": "Via Mantegna 82A", "imponibile": 500 },
                { "via": "Via De Gasperi 5", "imponibile": 121 },
                { "via": "Via Roma 113", "imponibile": 140 },
                { "via": "Via Roma 113 Palassin", "imponibile": 94 },
                { "via": "Via Cadore 46", "imponibile": 360 },
                { "via": "Via Cimabue 13", "imponibile": 980 },
                { "via": "Via Milano 36", "imponibile": 246.8 },
                { "via": "P.zza Vecchia Filanda 1", "imponibile": 300 },
                { "via": "Via Buonarroti 16", "imponibile": 125 },
                { "via": "Via Masaccio 5", "imponibile": 284.5 },
                { "via": "Via Corridoni 18", "imponibile": 240 },
                { "via": "Via San Francesco 8", "imponibile": 413.8 },
                { "via": "Via Mantegna 46", "imponibile": 520 },
                { "via": "Via Leonardo da Vinci 39", "imponibile": 260 },
                { "via": "Viale Assunta 13", "imponibile": 700 },
                { "via": "Via Giorgione 6", "imponibile": 511.5 },
                { "via": "Via Panama 14", "imponibile": 195 },
                { "via": "Via Delle Ande 3", "imponibile": 237.5 },
                { "via": "Via T. Grossi 11", "imponibile": 370 },
                { "via": "via Bergamo 6", "imponibile": 400 },
                { "via": "Via Montegrappa 10", "imponibile": 343.3 },
                { "via": "Via Cadorna 10", "imponibile": 177 },
                { "via": "Via Visconti 20", "imponibile": 366.66 },
                { "via": "Via Cimabue 2", "imponibile": 370 },
                { "via": "Via Mazzini 2", "imponibile": 720 },
                { "via": "Via Matteotti 1/3", "imponibile": 250 },
                { "via": "Strada Vicinale Cascina Torriana, snc", "imponibile": 950 },
                { "via": "via Fatebenefratelli 17", "imponibile": 300 },
                { "via": "Via Briantea 74", "imponibile": 280 },
                { "via": "Via Carducci 69", "imponibile": 180 },
                { "via": "Via Villoresi 12/14", "imponibile": 450 },
                { "via": "Via Pascoli 1-13", "imponibile": 2395 },
                { "via": "Via Milano 119", "imponibile": 185 },
                { "via": "Via Mincio 1G", "imponibile": 1960 },
                { "via": "Via Deledda 19 e Piazza Pasolini", "imponibile": 3200 },
                { "via": "Viale Assunta 112", "imponibile": 80 },
                { "via": "Via Oberdan 6/8", "imponibile": 700 },
                { "via": "Via Buonarroti 28", "imponibile": 230 },
                { "via": "Via Vespucci 38", "imponibile": 280 },
                { "via": "Via Pasubio 16", "imponibile": 930 },
                { "via": "Via Como 11", "imponibile": 590 },
                { "via": "Via Roma 126", "imponibile": 340 },
                { "via": "Via S. Pertini, 2/6", "imponibile": 460 },
                { "via": "Via San Francesco, 26F", "imponibile": 95 },
                { "via": "Via Mazzini, 5", "imponibile": 280 },
                { "via": "Via Conte Suardi, 68", "imponibile": 220 },
                { "via": "Via Torino Cernusco", "imponibile": 300 },
                { "via": "Via Monza, 79", "imponibile": 320 },
                { "via": "Via Pietro Nenni, 5", "imponibile": 480 },
                { "via": "Viale Assunta, 140", "imponibile": 160 },
                { "via": "Via Morelli, 1", "imponibile": 1500 },
                { "via": "Via Magistretti, 10", "imponibile": 1500 },
                { "via": "Via Fratelli di Dio, 2/A", "imponibile": 680 },
                { "via": "Viale Assunta, 73 e Via Diaz, 46", "imponibile": 600 },
                { "via": "Via Cimabue, 15", "imponibile": 860 },
                { "via": "Via Raffaello, 13", "imponibile": 230 },
                { "via": "Via Videmari, 3", "imponibile": 110 },
                { "via": "Via Mestre, 9 – 11", "imponibile": 4900 },
                { "via": "Via Pietro da Cernusco, 2", "imponibile": 400 },
                { "via": "Via Pietro da Cernusco, 2", "imponibile": 420 },
                { "via": "Via Lavalliere, 39", "imponibile": 370 },
                { "via": "Via Roggia Renatella, 1", "imponibile": 500 },
                { "via": "Via Carlo Mariani, 2", "imponibile": 680 },
                { "via": "Via Amendola, 7", "imponibile": 1500 },
                { "via": "Via Colombo, 19", "imponibile": 250 },
                { "via": "Via Marconi, 15", "imponibile": 330 },
                { "via": "Via Philips, 12", "imponibile": 3150 },
                { "via": "Via Buonarroti, 33, 35, 37", "imponibile": 200 },
                { "via": "Via Monza, 140D", "imponibile": 530 },
                { "via": "Via Adua, 26", "imponibile": 250 },
                { "via": "Via Tolmezzo, 10", "imponibile": 230 },
                { "via": "Via Rivoltana, 53", "imponibile": 125 },
                { "via": "Via D'Annunzio, 3", "imponibile": 190 },
                { "via": "Via Giuseppe di Vittorio, 347", "imponibile": 800 },
                { "via": "Via XXV Aprile, 23", "imponibile": 1580 },
                { "via": "Via Giancarlo Puecher, 1", "imponibile": 960 },
                { "via": "Via Ugo la Malfa, 1", "imponibile": 290 },
                { "via": "Via Adua, 30/32", "imponibile": 230 },
                { "via": "Via Martiri delle Foibe 2/4", "imponibile": 760 },
                { "via": "Via Arturo Toscanini, 16", "imponibile": 550 },
                { "via": "Vua Increa, 19", "imponibile": 380 },
                { "via": "via Cristei, 2", "imponibile": 90 },
                { "via": "Piazza Conciliazione, 2", "imponibile": 100 },
                { "via": "Via Dante, 30", "imponibile": 230 },
                { "via": "Via Piero Gobetti, 2/A", "imponibile": 1150 },
                { "via": "Via Sandro Pertini, 47", "imponibile": 380 },
                { "via": "Via Terra, 36", "imponibile": 480 },
                { "via": "Via Naviglio, 4", "imponibile": 240 },
                { "via": "Via Trieste, 27", "imponibile": 270 },
                { "via": "Via Filzi, 4", "imponibile": 230 },
                { "via": "Via De Amicis, 12A", "imponibile": 255 },
                { "via": "Via Enrico Mattei, Snc", "imponibile": 150 },
                { "via": "via De Gasperi 2", "imponibile": 1230 },
                { "via": "Via San Giovanni Bosco, 5", "imponibile": 390 },
                { "via": "Via Como, 3", "imponibile": 390 }
            ];

            const notFoundExtractedData: any[] = [];
            const matchedSiteIds = new Set<string>();

            // Cycle through extracted data
            extractedData.forEach(data => {
                const targetName = data.via.toLowerCase().trim();
                let bestMatch = null;

                // Try to find the site that includes this string or is included by it
                for (let i = 0; i < updatedSites.length; i++) {
                    const siteName = updatedSites[i].name.toLowerCase().trim();
                    if (siteName.includes(targetName) || targetName.includes(siteName)) {
                        bestMatch = i;
                        break;
                    }
                }

                if (bestMatch !== null && data.imponibile > 0) {
                    matchedCount++;
                    matchedSiteIds.add(updatedSites[bestMatch].id);
                    updatedSites[bestMatch] = {
                        ...updatedSites[bestMatch],
                        netMonthlyRevenue: data.imponibile
                    };
                } else {
                    notFoundExtractedData.push(data);
                }
            });

            // Find sites in App that didn't receive an update
            const sitesNoRevenue = updatedSites.filter(s => !matchedSiteIds.has(s.id));

            if (matchedCount > 0) {
                setSites(updatedSites);

                // Alert first
                setTimeout(() => {
                    alert(`🤖 Agente AI: Fatturati completati!\n✅ Cantieri aggiornati: ${matchedCount}\n❌ Voci foto NON trovate: ${notFoundExtractedData.length}\n📄 Cantieri App NON aggiornati: ${sitesNoRevenue.length}`);

                    // Trigger download of reports
                    let reportText = "=== VOCI DALLE FOTO NON TROVATE NELL'APP ===\n";
                    notFoundExtractedData.forEach(e => {
                        reportText += `- ${e.via} (Imponibile: ${e.imponibile}€)\n`;
                    });

                    reportText += "\n\n=== CANTIERI DELL'APP SENZA FATTURATO (o non trovati nelle foto) ===\n";
                    sitesNoRevenue.forEach(s => {
                        reportText += `- ${s.name} (Cat: ${s.category || 'N/A'})\n`;
                    });

                    const blob = new Blob([reportText], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `Report_Fatturati_Cantieri.txt`;
                    link.click();
                    URL.revokeObjectURL(url);

                }, 800);
            } else {
                alert('🤖 Agente AI: Nessun cantiere è stato trovato con quei nomi.');
            }

            setDone(true);
        }, 2000);

        return () => clearTimeout(t);
    }, [employees, sites, setEmployees, setSites, done]);

    return null;
};
