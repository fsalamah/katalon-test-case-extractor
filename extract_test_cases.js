const fs = require('fs');
const path = require('path');

/**
 * Test Cases Extraction Script
 *
 * Extracts from each test suite (.ts file):
 * - Suite Relative Path
 * - Test Case ID (in order as stored in the file)
 * - Is Run flag (true/false)
 * - BT Numbers (standardized format: BT-XXXX, comma separated)
 * - US Numbers (standardized format: US-XXXX, comma separated)
 *
 * Output: test_cases_extract.csv
 *
 * Usage: node extract_test_cases.js
 */

function extractBTNumbers(text) {
  // Extract BT numbers and standardize format (BT_XXXX or BT-XXXX → BT-XXXX)
  const btMatches = text.match(/BT[-_]\d+/gi);
  if (!btMatches) return [];

  // Standardize and deduplicate
  const standardized = btMatches.map(bt => {
    return bt.toUpperCase().replace('_', '-');
  });

  return [...new Set(standardized)];
}

function extractUSNumbers(text) {
  // Extract US numbers and standardize format (US_XXXX or US-XXXX → US-XXXX)
  const usMatches = text.match(/US[-_]\d+/gi);
  if (!usMatches) return [];

  // Standardize and deduplicate
  const standardized = usMatches.map(us => {
    return us.toUpperCase().replace('_', '-');
  });

  return [...new Set(standardized)];
}

function extractTestCases(filePath, relativePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const testCases = [];

    // Find all testCaseLink blocks in order using regex
    const testCaseLinkRegex = /<testCaseLink>([\s\S]*?)<\/testCaseLink>/g;
    let match;

    while ((match = testCaseLinkRegex.exec(content)) !== null) {
      const testCaseLinkContent = match[1];

      // Extract testCaseId
      const testCaseIdMatch = testCaseLinkContent.match(/<testCaseId>([^<]*)<\/testCaseId>/);
      const testCaseId = testCaseIdMatch ? testCaseIdMatch[1].trim() : '';

      // Extract isRun
      const isRunMatch = testCaseLinkContent.match(/<isRun>([^<]*)<\/isRun>/);
      const isRun = isRunMatch ? isRunMatch[1].trim().toLowerCase() === 'true' : false;

      if (testCaseId) {
        // Extract BT and US numbers from test case ID
        const btNumbers = extractBTNumbers(testCaseId);
        const usNumbers = extractUSNumbers(testCaseId);

        testCases.push({
          suiteRelativePath: relativePath,
          testCaseId: testCaseId,
          isRun: isRun,
          btNumbers: btNumbers.join(', '),
          usNumbers: usNumbers.join(', ')
        });
      }
    }

    return testCases;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return [];
  }
}

function findTsFiles(dir, basePath = dir) {
  const allTestCases = [];

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
        const testCases = extractTestCases(fullPath, relativePath);
        allTestCases.push(...testCases);
      }
    }
  }

  scanDirectory(dir);
  return allTestCases;
}

function main() {
  console.log('=================================');
  console.log('Test Cases Extraction Tool');
  console.log('=================================\n');

  const testSuitesDir = path.join(process.cwd(), 'Test Suites');

  if (!fs.existsSync(testSuitesDir)) {
    console.error(`Error: Test Suites directory not found at ${testSuitesDir}`);
    process.exit(1);
  }

  console.log(`Scanning directory: ${testSuitesDir}\n`);

  const allTestCases = findTsFiles(testSuitesDir);

  console.log(`Found ${allTestCases.length} test cases across all suites\n`);

  // Generate CSV
  const csvHeader = 'Suite Relative Path,Test Case ID,Is Run,BT Numbers,US Numbers\n';
  const csvRows = allTestCases.map(tc => {
    // Escape quotes in fields
    const escapedSuitePath = tc.suiteRelativePath.replace(/"/g, '""');
    const escapedTestCaseId = tc.testCaseId.replace(/"/g, '""');
    const escapedBTNumbers = tc.btNumbers.replace(/"/g, '""');
    const escapedUSNumbers = tc.usNumbers.replace(/"/g, '""');
    return `"${escapedSuitePath}","${escapedTestCaseId}",${tc.isRun},"${escapedBTNumbers}","${escapedUSNumbers}"`;
  }).join('\n');

  const csvContent = csvHeader + csvRows;

  fs.writeFileSync('test_cases_extract.csv', csvContent);

  // Summary statistics
  const totalTestCases = allTestCases.length;
  const enabledTestCases = allTestCases.filter(tc => tc.isRun).length;
  const disabledTestCases = allTestCases.filter(tc => !tc.isRun).length;
  const uniqueSuites = new Set(allTestCases.map(tc => tc.suiteRelativePath)).size;

  // Count unique BT and US numbers
  const allBTNumbers = new Set();
  const allUSNumbers = new Set();
  allTestCases.forEach(tc => {
    if (tc.btNumbers) {
      tc.btNumbers.split(', ').forEach(bt => {
        if (bt.trim()) allBTNumbers.add(bt.trim());
      });
    }
    if (tc.usNumbers) {
      tc.usNumbers.split(', ').forEach(us => {
        if (us.trim()) allUSNumbers.add(us.trim());
      });
    }
  });

  const testCasesWithBT = allTestCases.filter(tc => tc.btNumbers).length;
  const testCasesWithUS = allTestCases.filter(tc => tc.usNumbers).length;

  console.log('=================================');
  console.log('Summary');
  console.log('=================================');
  console.log(`Total Test Cases: ${totalTestCases}`);
  console.log(`Enabled (isRun=true): ${enabledTestCases}`);
  console.log(`Disabled (isRun=false): ${disabledTestCases}`);
  console.log(`Unique Suites: ${uniqueSuites}`);
  console.log(`Test Cases with BT Numbers: ${testCasesWithBT}`);
  console.log(`Test Cases with US Numbers: ${testCasesWithUS}`);
  console.log(`Unique BT Numbers: ${allBTNumbers.size}`);
  console.log(`Unique US Numbers: ${allUSNumbers.size}`);
  console.log('=================================\n');

  console.log('Results saved to test_cases_extract.csv');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { extractTestCases, findTsFiles };
