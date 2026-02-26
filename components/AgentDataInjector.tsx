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
        if (done) return;

        const t = setTimeout(() => {
            let updatedSites = [...sites];
            let updatedEmployees = [...employees];
            let hasGlobalChanges = false;
            let hasSiteChanges = false;

            // GET OR CREATE SITES WITH STRONG ID BINDING
            const getOrCreateSite = (name: string, address: string, city: string) => {
                let found = updatedSites.find(
                    (existing) => existing.name.toLowerCase().trim() === name.toLowerCase().trim()
                );
                if (!found) {
                    found = {
                        id: 'site-forced-' + Math.random().toString(36).substr(2, 9),
                        name: name,
                        address: address,
                        city: city,
                    };
                    updatedSites.push(found);
                    hasSiteChanges = true;
                }
                return found.id;
            };

            // 1. FORZARE CREAZIONE SITI
            const newSitesToCreate = [
                { n: 'via De Amicis 12A', c: 'Segrate' },
                { n: 'via Mazzini 5', c: 'Segrate' },
                { n: 'via Conte Suardi 68', c: 'Segrate' },
                { n: 'via Cristei, 2', c: 'Segrate' },
                { n: 'via Fatebenefratelli 21', c: 'Cernusco' },
                { n: 'ACLI via Fatebenefratelli 17', c: 'Cernusco' },
                { n: 'via Mincio 1G', c: 'Ronco/Cernusco' },
                { n: 'via Cadorna 10', c: 'Cernusco' }
                // via Colombo 1 already handled
            ];

            newSitesToCreate.forEach(s => {
                getOrCreateSite(s.n, s.n, s.c);
            });

            // 2. CREARE E ASSEGNARE TURNI AI 4 DIPENDENTI
            const newEmployeesData = [
                {
                    first: 'BANDARA',
                    last: '',
                    schedule: [
                        { name: 'via De Amicis 12A', city: 'Segrate', mon: 0, tue: 1, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
                        { name: 'via Mazzini 5', city: 'Segrate', mon: 0, tue: 0, wed: 0, thu: 2, fri: 0, sat: 0, sun: 0 },
                        { name: 'via Conte Suardi 68', city: 'Segrate', mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 2, sun: 0 },
                        { name: 'via Cristei, 2', city: 'Segrate', mon: 2, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0, note: 'Ogni 2 settimane di Sabato' },
                    ]
                },
                {
                    first: 'MARIKA',
                    last: '',
                    schedule: [
                        { name: 'via Fatebenefratelli 21', city: 'Cernusco', mon: 3, tue: 0, wed: 0, thu: 3, fri: 0, sat: 0, sun: 0 },
                        { name: 'ACLI via Fatebenefratelli 17', city: 'Cernusco', mon: 0, tue: 2, wed: 0, thu: 0, fri: 2, sat: 0, sun: 0 },
                    ]
                },
                {
                    first: 'NATALIA',
                    last: '',
                    schedule: [
                        { name: 'via Mincio 1G', city: 'Ronco/Cernusco', mon: 0, tue: 5, wed: 0, thu: 0, fri: 5, sat: 0, sun: 0 },
                    ]
                },
                {
                    first: 'GUALTIERI',
                    last: 'ISA',
                    schedule: [
                        { name: 'via Colombo 1', city: 'Cernusco', mon: 0, tue: 1, wed: 0, thu: 0, fri: 1, sat: 0, sun: 0 },
                        { name: 'via Cadorna 10', city: 'Cernusco', mon: 1, tue: 0, wed: 0, thu: 1, fri: 0, sat: 0, sun: 0 },
                    ]
                }
            ];

            newEmployeesData.forEach(empData => {
                let empIndex = updatedEmployees.findIndex(
                    e => e.firstName.toLowerCase() === empData.first.toLowerCase() && e.lastName.toLowerCase() === empData.last.toLowerCase()
                );

                if (empIndex === -1) {
                    empIndex = updatedEmployees.length;
                    updatedEmployees.push({
                        id: 'emp-' + Math.random().toString(36).substr(2, 9),
                        firstName: empData.first,
                        lastName: empData.last,
                        hourlyRate: 10,
                        contractHours: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
                        defaultAssignments: [],
                    });
                    hasGlobalChanges = true;
                }

                const emp = { ...updatedEmployees[empIndex] };
                const currentAssignments: any[] = [];

                empData.schedule.forEach(sa => {
                    const siteId = getOrCreateSite(sa.name, sa.name, sa.city);
                    currentAssignments.push({
                        siteId,
                        startDate: '2026-01-01',
                        schedule: { mon: sa.mon, tue: sa.tue, wed: sa.wed, thu: sa.thu, fri: sa.fri, sat: sa.sat, sun: sa.sun },
                        type: 'HOURLY',
                        recurrence: 'WEEKLY',
                        interval: 1,
                        note: (sa as any).note || ''
                    });
                });

                emp.defaultAssignments = currentAssignments;
                updatedEmployees[empIndex] = emp;
                hasGlobalChanges = true;
            });

            if (hasGlobalChanges || hasSiteChanges) {
                console.log("Agent: Enforcing sync to bypass cache limitations...");
                setSites(updatedSites);

                setTimeout(() => {
                    setEmployees(updatedEmployees);
                }, 1000);

                setTimeout(() => {
                    alert("🤖 Agente AI: COMPLETATO! 4 NUOVI DIPENDENTI!\n✅ Bandara, Marika, Natalia, Gualtieri Isa inseriti col corretto numero di ore e StartDate '01/01/2026'.");
                }, 2000);
            }

            setDone(true);
        }, 2000);

        return () => clearTimeout(t);

    }, [employees, sites, setEmployees, setSites, done]);

    return null;
};
