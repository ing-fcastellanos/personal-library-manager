## 1. Classification helper

- [x] 1.1 Add a pure `classifyShelfBook({ aiConfidence, enriched, duplicate }, threshold)` returning `{ bucket, reason }`
- [x] 1.2 `auto` iff `aiConfidence >= threshold && enriched && !duplicate`; else `review` with reason (`low_confidence` → `no_match` → `duplicate`)
- [x] 1.3 Export the default high-confidence threshold (0.8) as a tunable constant
- [x] 1.4 Unit-test all buckets/reasons + purity (emulator-free)

## 2. Identify-shelf endpoint

- [x] 2.1 Add `server/routes/ai-shelf.ts`: `POST /api/ai/identify-shelf` (`requireAuth`), zod-validated `{ imageBase64, contentType }`
- [x] 2.2 Reuse the 8mb base64 limit + content-type validation (mirror `/api/ai/identify`)
- [x] 2.3 Call `identifyBooksFromImage`; respond `{ books, sourceProvider }`; map `NoEngineAvailableError` to a clear status
- [x] 2.4 Mount the router + register the path with the elevated JSON limit in `server/index.ts`
- [x] 2.5 Route tests: auth gate, validation/oversize `400`, success shape, empty result, error mapping

## 3. Verify

- [x] 3.1 Confirm no API key reaches the client; the endpoint is auth-gated
- [x] 3.2 Run lint, typecheck, and the test suite green
