function step(log) {
    if (
        log.op.match.toString().match(/LOG[34]/) &&
        log.stack.length() >= 5 &&
        log.stack.peek(2).toString() ===
            "100389287136786176327247604509743168900146139575972864366142685224231313322991"
    ) {
        // Get ERC20 and ERC721 Transfer events
        this.data.push({
            from: toHex(toAddress(log.stack.peek(3).toString(16))),
            to: toHex(toAddress(log.stack.peek(4).toString(16))),
            pc: log.getPC(),
            tokenAddress: toHex(log.contract.getAddress()),
        })
    } else if (
        log.op.toString() === "CALL" &&
        log.stack.length() >= 2 &&
        log.stack.peek(2) > 0
    ) {
        // Get transfers of native Ether
        this.data.push({
            from: toHex(log.contract.getAddress()),
            to: toHex(toAddress(log.stack.peek(1).toString(16))),
            value: log.stack.peek(2),
            pc: log.getPC(),
        })
    }
}
