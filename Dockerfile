FROM rustlang/rust:nightly

RUN rustup default nightly && rustup update

WORKDIR /usr/src/app

COPY . .

RUN cargo update && cargo build --release