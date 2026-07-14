# dev.ps1
# -c: Clear the screen before each run
# -w src: Only watch the `src` directory (ignores frontend, target, etc.)
# -i "model/**": Ignore the model directory explicitly
# -i "*.log": Ignore any log files
# -q: Quiet mode to reduce output noise
# -x check -x run: Run `cargo check` for fast error reporting, then `cargo run` if check passes

Write-Host "Starting Rust backend in watch mode..." -ForegroundColor Green
cargo watch -c -w src -i "model/**" -i "*.log" -q -x check -x run
