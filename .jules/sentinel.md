## 2025-05-21 - [Prevent Command Injection on Windows in OpenBrowser]
**Vulnerability:** A command injection vulnerability was present in `pkg/auth/oauth.go` where `cmd /c start <url>` was used to open URLs on Windows. If a URL contained shell metacharacters like `&` or spaces, it could allow arbitrary command execution.
**Learning:** Using `cmd.exe` to process potentially user-supplied or external strings is inherently risky due to the way it parses metacharacters. Even if the immediate input is trusted, the pattern is dangerous.
**Prevention:** Always avoid shell execution when possible. For opening URLs on Windows, use the safer mechanism `rundll32 url.dll,FileProtocolHandler <url>`, which passes the URL directly to the registered protocol handler without shell evaluation.
