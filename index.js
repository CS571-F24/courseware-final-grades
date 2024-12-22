
import fs from 'fs';
import * as csv_parse_sync from 'csv-parse/sync';
import * as csv_stringify_sync from 'csv-stringify/sync';

import { exit } from 'process';

const BONUS_ASSIGNMENT_NAME = "BONUS: Security CTF (2367909)";

const FILE_GRADEBOOK_CSV = fs.readFileSync('./includes/gradebook.csv');
const FILE_FACULTY_CSV = fs.readFileSync('./includes/faculty.csv');
const FILE_ROSTER_CSV = fs.readFileSync('./includes/roster.csv');

const dataGradebook = csv_parse_sync.parse(FILE_GRADEBOOK_CSV, {
    columns: true,
});

const dataFaculty = csv_parse_sync.parse(FILE_FACULTY_CSV, {
    columns: true,
});

const dataRoster = csv_parse_sync.parse(FILE_ROSTER_CSV, {
    columns: true,
});

dataGradebook.splice(0, 2); // first 2 records of gradebook are gibberish

if (!Object.keys(dataGradebook[0]).includes(BONUS_ASSIGNMENT_NAME)) {
    console.error(`The given bonus assignment (${BONUS_ASSIGNMENT_NAME}) is not valid!`);
    console.error("Aborting. Look up this name in 'gradebook.csv' before continuing.")
}

const gradebookStuds = dataGradebook.map(pers => {
    if (![
        pers["Current Score"],
        pers["Unposted Current Score"],
        pers["Final Score"],
        pers["Unposted Final Score"]
    ].every(num => num === pers["Current Score"])){
        console.warn(`Not all scores match for ${pers["Student"]}. Is something unposted?`)
    }
    return {
        name: pers["Student"],
        email: pers["SIS Login ID"].toUpperCase(),
        section: pers["Section"],
        bonus: parseFloat(pers[BONUS_ASSIGNMENT_NAME]),
        score: parseFloat(pers["Final Score"])
    }
}).filter(p => p.name !== "Student, Test");

const rosterStuds = dataRoster.map(pers => {
    return {
        name: {
            first: pers["first_name"],
            middle: pers["middle_name"],
            last: pers["last_name"]
        },
        email: pers["campus_email"].toUpperCase(),
        wiscard: pers["isis_univid"],
        emplid: pers["isis_emplid"]
    }
})
const errPers = []
const jumboStuds = gradebookStuds.map(gbPers => {
    const pers = rosterStuds.find(rosterPers => gbPers.email === rosterPers.email);
    if (pers) {
        return {
            gradebook: gbPers,
            roster: pers
        }
    } else {
        errPers.push(gbPers);
        return undefined;
    }
}).filter(p => p)

if (errPers.length !== 0) {
    console.error("The following 'gradebook.csv' students do not have a matching email in 'roster.csv'!");
    errPers.forEach(pers => console.error(`${pers.name} (${pers.email})`));
    console.error("Aborting. Be sure to list a matching email between 'gradebook.csv' and 'roster.csv'!")
    exit(1);
}

const gradeCounts = {
    "A": 0,
    "AB": 0,
    "B": 0,
    "BC": 0,
    "C": 0,
    "D": 0,
    "F": 0
}

const newDataFaculty = dataFaculty.map(facPers => {
    let newFacPers = JSON.parse(JSON.stringify(facPers));
    const pers = jumboStuds.find(jPers => jPers.roster.wiscard === facPers["Campus ID"]);
    if (!pers) {
        console.warn(`Could not find a match for ${facPers[" First Name"]}, ${facPers[" Last Name"]} (${facPers["Campus ID"]}) skipping...`)
        return newFacPers;
    } else {
        let finalGrade = pers.gradebook.score + pers.gradebook.bonus;
        if (finalGrade >= 94) {
            newFacPers[" Grade Input"] = "A";
            gradeCounts["A"] += 1;
        } else if (finalGrade >= 88) {
            newFacPers[" Grade Input"] = "AB";
            gradeCounts["AB"] += 1;
        }  else if (finalGrade >= 82) {
            newFacPers[" Grade Input"] = "B";
            gradeCounts["B"] += 1;
        } else if (finalGrade >= 76) {
            newFacPers[" Grade Input"] = "BC";
            gradeCounts["BC"] += 1;
        } else if (finalGrade >= 70) {
            newFacPers[" Grade Input"] = "C";
            gradeCounts["C"] += 1;
        } else if (finalGrade >= 60) {
            newFacPers[" Grade Input"] = "D";
            gradeCounts["D"] += 1;
        } else {
            newFacPers[" Grade Input"] = "F";
            gradeCounts["F"] += 1;
        }
        return newFacPers;
    }
});

const dataCsv2Write = csv_stringify_sync.stringify(newDataFaculty, {
    header: true
});

fs.writeFileSync("faculty_output.csv", dataCsv2Write);

console.log("Complete! See grade counts below.");
Object.entries(gradeCounts).forEach(e => console.log(`${e[0]}: ${e[1]}`));
