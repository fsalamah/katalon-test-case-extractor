const fs = require('fs');
const path = require('path');

function extractBTNumbers(text) {
  const btMatches = text.match(/BT[-_]\d+/g);
  return btMatches ? [...new Set(btMatches)] : [];
}

function checkIsCollection(content) {
  // Check if the root node is TestSuiteCollectionEntity (collection) or TestSuiteEntity (regular suite)
  // Look for the root entity type in the XML content
  const collectionMatch = content.match(/<TestSuiteCollectionEntity>/);
  const suiteMatch = content.match(/<TestSuiteEntity>/);

  if (collectionMatch) {
    return true;
  } else if (suiteMatch) {
    return false;
  }

  // Fallback: if neither is found, return false (assume regular suite)
  return false;
}

function checkIsE2E(relativePath, fileName, testCaseCount) {
  // Rule 1: If relative path contains "Test Cases Suite", it's NOT E2E
  if (relativePath.includes('Test Cases Suite')) {
    return false;
  }

  // Rule 2: If filename contains e2e/end-to-end/end to end AND has only 1 test case AND does NOT contain "Test Cases Suite"
  const e2eFilePattern = /e2e|end-to-end|end to end/i;
  if (e2eFilePattern.test(fileName) && testCaseCount === 1 && !relativePath.includes('Test Cases Suite')) {
    return true;
  }

  // Rule 3: If relative path contains specific E2E patterns
  const e2ePathPattern = /E2E Test Suite|e-2-e|End-to-end|end to end/i;
  if (e2ePathPattern.test(relativePath)) {
    return true;
  }

  // Default: not E2E
  return false;
}

function analyzeTestSuite(filePath, relativePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const testCaseMatches = content.match(/<testCaseLink>/g);
    const testCaseCount = testCaseMatches ? testCaseMatches.length : 0;

    // Check if this is a collection
    const isCollection = checkIsCollection(content);

    // Extract file name from path
    const fileName = path.basename(filePath);

    // Check if this is an E2E suite
    const isE2E = checkIsE2E(relativePath, fileName, testCaseCount);

    // First check for BT numbers in the file path
    let btNumbers = extractBTNumbers(relativePath);

    // If no BT numbers in path, extract from test case names
    if (btNumbers.length === 0) {
      const testCaseIdMatches = content.match(/<testCaseId>([^<]+)<\/testCaseId>/g);
      if (testCaseIdMatches) {
        testCaseIdMatches.forEach(match => {
          const testCaseName = match.replace(/<\/?testCaseId>/g, '');
          const caseBTNumbers = extractBTNumbers(testCaseName);
          btNumbers = [...new Set([...btNumbers, ...caseBTNumbers])];
        });
      }
    }

    return {
      testCases: testCaseCount,
      btNumbers: btNumbers.join('; '),
      isCollection: isCollection,
      isE2E: isE2E
    };
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return {
      testCases: 0,
      btNumbers: '',
      isCollection: false,
      isE2E: false
    };
  }
}

function findTsFiles(dir, basePath = dir) {
  const tsFiles = [];

  function scanDirectory(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!item.startsWith('.') && item !== 'node_modules') {
          scanDirectory(fullPath);
        }
      } else if (item.endsWith('.ts')) {
        const relativePath = path.relative(basePath, fullPath);
        const analysis = analyzeTestSuite(fullPath, relativePath);
        tsFiles.push({
          path: relativePath,
          testCases: analysis.testCases,
          btNumbers: analysis.btNumbers,
          isCollection: analysis.isCollection,
          isE2E: analysis.isE2E
        });
      }
    }
  }

  scanDirectory(dir);
  return tsFiles;
}

const testSuitesDir = path.join(process.cwd(), 'Test Suites');
const tsFiles = findTsFiles(testSuitesDir);

// Updated CSV header to include is_collection and is_e2e columns
const csvContent = 'Relative Path,Test Cases,BT Numbers,Is Collection,Is E2E\n' +
  tsFiles.map(file => `"${file.path}",${file.testCases},"${file.btNumbers}",${file.isCollection},${file.isE2E}`).join('\n');

fs.writeFileSync('ts_files_with_counts_v2.csv', csvContent);

console.log(`Found ${tsFiles.length} TypeScript files`);
console.log(`Collections: ${tsFiles.filter(f => f.isCollection).length}`);
console.log(`Regular Suites: ${tsFiles.filter(f => !f.isCollection).length}`);
console.log(`E2E Suites: ${tsFiles.filter(f => f.isE2E).length}`);
console.log(`Non-E2E Suites: ${tsFiles.filter(f => !f.isE2E).length}`);
console.log('Results saved to ts_files_with_counts_v2.csv');
