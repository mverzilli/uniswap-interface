# SingletonGatedERC1155ValidationHook

One validation hook shared by many auctions, each gated on holding its own ZKPassport credential. The source is Uniswap's, flattened from [continuous-clearing-auction PR #367](https://github.com/Uniswap/continuous-clearing-auction/pull/367).

Deploy to Sepolia, pointed at the ZKPassportCredentials contract:

```sh
forge create src/SingletonGatedERC1155ValidationHook.sol:SingletonGatedERC1155ValidationHook \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com --account <keystore-account> --broadcast \
  --constructor-args 0x000C558ea450790ad88f4f15A302B8F2C9b60d6C
```
