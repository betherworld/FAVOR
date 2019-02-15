# Favor

(todo: descritpion)

# Prerequisites

## Prerequisites

* node v10.15.1
* npm v6.7.0

## Toolchain

* Truffle v5.0.4 (core: 5.0.4) with Solidity v0.5.0 (solc-js)
* Ganache v1.3.0 or Ganache CLI v6.3.0 (ganache-core: 2.4.0)
* Metamask v6.0.1

# Setup

```
git clone https://github.com/srozov/BETH19
cd BETH19
```

# Deployment

## Using ganache (default)

1. run Ganache (default settings: port 127.0.0.1:7545 and network id 5777)
2. set up metamask account by copying the seed phrase from Ganache, change network to custom RPC and set the _New RPC URL_ field to Ganache url address (default: http://127.0.0.1:7545)
3. in project root directory, execute the following:
```
truffle compile --all
truffle migrate --reset
npm run dev
```

## Using ganache-cli

1. run ganache-cli (default settings: port 127.0.0.1:8545)
2. set up metamask account by copying the seed phrase from ganache-cli, change network to custom RPC and set the _New RPC URL_ field to ganache-cli url address (default: http://127.0.0.1:8545)
3. in project root directory, execute the following:
```
truffle compile --all
truffle migrate --reset --network ganachecli
npm run dev
```

# Troubleshooting

* If there are compilation/deployment errors, try removing the build directory by executing `rm -rf build`
