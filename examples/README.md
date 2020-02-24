# Example UML Sequence Diagrams

## Kyber

[Kyber network](https://kyber.network/) transaction.

![Kyber](./kyber.png)

```
tx2uml 0xe2e3ef2513c8e3da306cb427c03ae0114062fd09568bec559d5880c490ff743a
```

## Unknown function names

When the ABI and function signatures are not known, the function selector is show. That's 0xae8123ba in the below example

![FuncSelectors](./funcSelectors.png)

```
tx2uml 0x7aca0414c3c04e58c11ad6b7d13bbfe1c6d4500fbe402900da9abf6bb6f53a8d
```

## Failed transaction

See which contract call failed a transaction

![failed](./failedTx.png)

```
tx2uml 0x0a99314379caf3dcbbc6e1f5b0dda8a41e3a8b5a0d9b1c1ec744be1f1cf781ea
```

## 1inch Exchange

The [1inch exchange](https://1inch.exchange/) aggregates the exchange of Ether and tokens across on-chain liquidity providers so does lots of calls to different contracts.

![1inch](./1inch.png)

```
tx2uml 0x34e4f8b86b5c3fe5a9e30e7cf75b242ed3e6e4eeea68cfaf3ca68ef1edb93ed1 -o 1inch
```
