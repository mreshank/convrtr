# Security Policy

## Architectural Invariants

convrtr is engineered as a static technical instrument that executes all conversions strictly client-side. The security model relies on complete local isolation:

1. **Zero Outbound Data Transmission:** No file contents, file metadata, or processing logs are ever transmitted to an external server. There is no backend application server.
2. **Memory Isolation:** WebAssembly execution operates inside dedicated Web Workers. Memory allocations are bound to local Worker heap limits and discarded upon session completion.
3. **Execution Headers:** The web application is served with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` to prevent side-channel inspection of `SharedArrayBuffer` memory.
4. **Automated Verification:** Continuous integration test suites execute Playwright network assertions to enforce that zero outbound network requests occur during any conversion pipeline.

## Supported Versions

| Version | Supported |
| :--- | :--- |
| 0.2.x (Latest) | Yes |
| 0.1.x | No |

## Reporting a Security Vulnerability

If you discover a vulnerability, potential memory leak, side-channel vulnerability, or any network leak where user data could leave the client context, please report it privately:

- **Email:** security@convrtr.mreshank.com
- **PGP / Sensitive Inquiries:** Contact repository maintainers directly via GitHub private vulnerability reporting.

Please include:
- Description of the suspected vulnerability.
- Reproduction steps or minimal test case (sample file format and converter used).
- Browser engine, operating system, and hardware architecture.

All legitimate vulnerability disclosures will be acknowledged within 48 hours, and patches will be deployed immediately upon verification.
