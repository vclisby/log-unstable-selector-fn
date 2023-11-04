import path from 'path';
import { readdir } from 'fs/promises';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { occurrences } from './utilities.js';

const SINGLE_LINE_SUSPICIOUS = ['...', '=> [', '??', '||'];
const MULTI_LINE_SUSPICIOUS = ['let', 'const', '...', '[', ']', '??', '||', '=>'];
const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

async function processFile(path) {
    const rl = createInterface({
        input: createReadStream(path),
        crlfDelay: Infinity,
    });

    let isInUseSelector = false;
    let useSelectorParenthesesCount = [0, 0];
    let useSelectorLines = [];
    let useSelectorSuspicious = false;

    let lineNumber = 1;

    for await (const line of rl) {
        if (line.includes('useSelector')) {
            // One liner:
            // const x = useSelector((state: State) => state.counts.x);
            //
            // If there is a closing bracket followed by a semi colon, the useSelector must be a one liner.
            if (line.includes(');')) {
                // Simply check this one line for any suspicious terms and then log if needed.
                if (SINGLE_LINE_SUSPICIOUS.some((s) => line.includes(s))) {
                    console.log(path, ' line ', lineNumber);
                    console.log(line);
                }

                if (occurrences(line, '(') > 2 || occurrences(line, ')') > 2) {
                    console.log(path, ' line ', lineNumber);
                    console.log(line);
                }
            }
            // Multi liner:
            // const x = useSelector((state: State) => {
            //    const y = state.counts.x;
            //    return y;
            // });
            //
            // This scenario is trickier. We need to track the count of parentheses over multiple lines until
            // we find the final closing parentheses for the useSelector hook.
            else {
                isInUseSelector = true;
                useSelectorParenthesesCount = [occurrences(line, '('), occurrences(line, ')')];
                useSelectorLines.push(line);

                if (useSelectorParenthesesCount[0] === useSelectorParenthesesCount[1]) {
                    break;
                }

                if (SINGLE_LINE_SUSPICIOUS.some((s) => line.includes(s))) {
                    useSelectorSuspicious = true;
                }
            }
        } else if (isInUseSelector) {
            const [open, closed] = useSelectorParenthesesCount;
            useSelectorParenthesesCount = [occurrences(line, '(') + open, occurrences(line, ')') + closed];
            useSelectorLines.push(line);

            if (useSelectorParenthesesCount[0] === useSelectorParenthesesCount[1]) {
                if (useSelectorSuspicious) {
                    console.log(path, ' line ', lineNumber - useSelectorLines.length + 1, ' - ', lineNumber);
                    useSelectorLines.forEach((l) => console.log(l));
                }

                isInUseSelector = false;
                useSelectorParenthesesCount = [0, 0];
                useSelectorLines = [];
                useSelectorSuspicious = false;
            } else if (!useSelectorSuspicious) {
                useSelectorSuspicious = MULTI_LINE_SUSPICIOUS.some((s) => line.includes(s));
            }
        }

        lineNumber++;
    }
}

async function processDirectory(directory, isInitial) {
    const allEntries = await readdir(directory, { withFileTypes: true }, (err, files) => {
        throw err;
    });

    // If we are calling this for the first time, we want to filter this script file out of the process.
    const filteredEntries = allEntries; // isInitial ? allEntries.filter((e) => e.name !== path.basename(__filename)) : allEntries;

    const { dirs, files } = filteredEntries.reduce(
        (acc, curr) => {
            if (curr.isDirectory()) {
                return { ...acc, dirs: [...acc.dirs, curr] };
            }

            return { ...acc, files: [...acc.files, curr] };
        },
        { dirs: [], files: [] }
    );

    // Process the files in the current directory.
    for (const file of files) {
        console.log(file);
        const extension = path.extname(file.name);

        if (EXTENSIONS.includes(extension)) {
            const filePath = path.join(directory, file.name);

            await processFile(filePath);
        }
    }

    // Recursively process the dirs in the current directory.
    if (dirs.length > 0) {
        for (const dir of dirs) {
            await process(path.join(directory, dir.name));
        }
    }

    if (isInitial) {
        console.log('DONE');
    }
}

const dir = process.argv.some((arg) => arg === '--test') ? './tests' : '';

processDirectory(dir, true);
