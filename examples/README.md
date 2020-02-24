# Example UML Sequence Diagrams

## 1inch Exchange

The [1inch exchange](https://1inch.exchange/) aggregates the exchange of Ether and tokens across on-chain liquidity providers so does lots of calls to different contracts.

![1inch](./1inch.png)

```
tx2uml 0x34e4f8b86b5c3fe5a9e30e7cf75b242ed3e6e4eeea68cfaf3ca68ef1edb93ed1 -o 1inch
```

## Unknown function names

When the ABI and function signatures are not known, the function selector is show. That's 0xae8123ba in the below example

![FuncSelectors](./funcSelectors.png)

```
tx2uml 0x7aca0414c3c04e58c11ad6b7d13bbfe1c6d4500fbe402900da9abf6bb6f53a8d
```
