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
            let updatedEmployees = [...employees];
            let hasGlobalChanges = false;

            // START DATE OVERRIDE SCRIPT
            updatedEmployees = updatedEmployees.map(emp => {
                let empChanged = false;
                if (emp.defaultAssignments && emp.defaultAssignments.length > 0) {
                    const updatedAssignments = emp.defaultAssignments.map(assignment => {
                        if (assignment.startDate !== '2026-01-01') {
                            empChanged = true;
                            return {
                                ...assignment,
                                startDate: '2026-01-01'
                            };
                        }
                        return assignment;
                    });

                    if (empChanged) {
                        hasGlobalChanges = true;
                        return {
                            ...emp,
                            defaultAssignments: updatedAssignments
                        };
                    }
                }
                return emp;
            });

            if (hasGlobalChanges) {
                console.log("Agent: Forcing overwrite for ALL employee start dates...");
                setEmployees(updatedEmployees);

                setTimeout(() => {
                    alert("🤖 Agente AI: Ho aggiornato la 'Data Inizio' per TUTTI gli assegnamenti!\n✅ Ora tutti partono correttamente dal 01/01/2026.");
                }, 500);
            } else {
                console.log("Agent: All dates already set to 2026-01-01 or no assignments found.");
            }

            setDone(true);
        }, 1500);

        return () => clearTimeout(t);

    }, [employees, setEmployees, done]);

    return null;
};
