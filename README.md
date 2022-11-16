# boardwalk-sdk

> SDK to build decentralised marketplaces on top of EVM blockchain and waku.

**Warning: This project is in active develoment. There might (and most probably will) be changes in the future to its API and working. Also, no guarantees can be made about its stability, efficiency, and security at this stage.**

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Development setup](#development-setup)
- [Maintainers](#maintainers)
- [License](#license)

## Install

```sh
TBD
```

## Usage

```
TBD
```

## Development setup

1. Make sure you cloned the repo with submodules

```
git submodule update --init --recursive
```

2. Make sure you have [foundry](https://github.com/foundry-rs/foundry) installed. The easiest is to run:

```
curl -L https://foundry.paradigm.xyz | bash

foundryup
```

3. Make sure you have Docker running.

4. Install dependencies. This will also install dependencies for the `boardwalk-contracts` and compile them.

```
npm ci
```

5. Run a blockchain and waku (if not already).

```
npm run blockchain:start
npm run waku:start
```

6. Run tests

```
npm run test
```

## Maintainers

- [vojtechsimetka](https://github.com/vojtechsimetka)
- [filoozom](https://github.com/filoozom)

## License

[MIT](./LICENSE)
