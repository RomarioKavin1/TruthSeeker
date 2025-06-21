# TruthSeeker

rustup override set nightly

rm -rf data_node && RISC0_DEV_MODE=true SP1_PROVER=mock cargo run -- --pg
rm -rf data 2>/dev/null || true && clear && RISC0_DEV_MODE=true SP1_PROVER=mock cargo run --bin server --release -- -m -a -w
