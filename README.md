# Katalon test case extractor

Small Node.js scripts that read a Katalon Studio project's `Test Suites` folder and write what they find to CSV. No dependencies, only Node.js 14 or newer.

Run them from the **root of the Katalon project**, the folder that contains `Test Suites`.

## `extract_test_cases.js`

Lists every test case linked in every test suite.

```
node path/to/extract_test_cases.js
```

Writes `test_cases_extract.csv` in the current folder, with these columns:

| Column | Meaning |
|---|---|
| Suite Relative Path | The suite file, relative to `Test Suites` |
| Test Case ID | The linked test case, in the order stored in the suite |
| Is Run | `true` or `false`, the suite's run flag for that test case |
| BT Numbers | `BT-XXXX` numbers found in the test case ID (`BT_1234` is read as `BT-1234`) |
| US Numbers | `US-XXXX` numbers found in the test case ID |

It also prints a summary: total, enabled and disabled test cases, unique suites, and unique BT and US numbers.

## `extract_ts_files_with_collection_flag.js`

Lists the test suites themselves, with the number of test cases in each, whether the file is a test suite collection, and an end-to-end flag. It writes `ts_files_with_counts_v2.csv`.

```
node path/to/extract_ts_files_with_collection_flag.js
```

Both scripts only read your project and write one CSV into the folder you run them from.
