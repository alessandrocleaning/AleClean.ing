import React from 'react';
import { Employee, Site } from '../types';

export const AgentDataInjector: React.FC<{
    employees: Employee[];
    setEmployees: (e: Employee[]) => void;
    sites: Site[];
    setSites: (s: Site[]) => void;
}> = ({ employees, setEmployees, sites, setSites }) => {
    // Disabled logic
    return null;
};
