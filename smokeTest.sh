#!/usr/bin/env bash

set -e 
echo "Running tests..."

npm test -- test/unit/authServices.unit.test.ts -t "Tests Authentication Services"
npm test -- test/unit/authUtils.unit.test.ts -t "Tests Authentication Utilities"
npm test -- test/unit/embeddingProvider.unit.test.ts -t "Tests Embedding Provider"
npm test -- test/unit/matchingSuggestions.unit.test.ts -t "Tests Matching Suggestion"
npm test -- test/unit/saveScrapeRun.unit.test.ts -t "Tests Saving A Scrape Run"
npm test -- test/unit/scraperEngineDiagnostics.unit.test.ts -t "Tests Scraping Engine Diagnostics"
npm test -- test/unit/scrapeRunServices.unit.test.ts -t "Tests Scrape Run Services"
npm test -- test/unit/trackedStores.unit.test.ts -t "Tests Tracked Stores"
npm test -- test/unit/trackingQueries.unit.test.ts -t "Tests Querying Results"
npm test -- test/unit/trackingRunsRepository.unit.test.ts -t "Tests Tracking"
npm test -- test/unit/trackingServices.unit.test.ts -t "Tests Tracking Services"
npm test -- test/manual/woocomm-test.manual.ts -t "Tests Woocomerce"
npm test -- test/integration/db-test-helpers.ts -t "Tests Database Test Helpers"
npm test -- test/integration/setup-env.ts -t "Tests Setup Env"
npm test -- test/integration/sqlite-product-detail.integration.test.ts -t "Tests DB Integration"
npm test -- test/integration/sqlite-scrape-persistence.integration.test.ts -t "Tests DB Persistence"
npm test -- test/integration/sqlite-tracked-products.integration.test.ts -t "Tests DB Tracked Products"
npm test -- test/integration/sqlite-tracking-runs.integration.test.ts -t "Tests DB Tracking"

echo " "
echo "SUCCESS: All Tests Passed, Smoke Test Is Clear"