// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IERC20Decimal {
    // A lot of decimals are uint8 but they can be cast up to uint256
    function decimals() external view returns (uint256);
}

interface IERC20String {
    function symbol() external view returns (string memory);

    function name() external view returns (string memory);
}

interface IERC20Bytes32 {
    function symbol() external view returns (bytes32);

    function name() external view returns (bytes32);
}

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// https://github.com/ensdomains/reverse-records/blob/master/contracts/ReverseRecords.sol
interface IReverseRecords {
    function getNames(address[] calldata addresses)
        external
        view
        returns (string[] memory ensNames);
}

struct Info {
    string symbol;
    string name;
    uint256 decimals;
    bool noContract;
    bool nft;
    string ensName;
}

/**
 * @notice Used to get token information for many addresses in a single call.
 * If an address is not a contract or a token, the batch will not fail.
 * @author Nick Addison
 */
contract TokenInfo {
    /// @notice The address of the Ethereum Name Service's ReverseRecords contract
    /// @dev Only available on Mainnet and Goerli.
    address public immutable ReverseRecords;

    /// @param _reverseRecords The address of the Ethereum Name Service's ReverseRecords contract
    constructor(address _reverseRecords) {
        ReverseRecords = _reverseRecords;
    }

    /// @notice Gets contract and token information for a list of address.
    /// Getting the token name, symbol, decimals and NFT interface checks are wrapped
    /// in a try catch to prevent the batch from reverting if one of the addresses is not a token.
    function getInfoBatch(address[] calldata tokens) external view returns (Info[] memory infos) {
        string[] memory ensNames = address(ReverseRecords) != address(0)
            ? IReverseRecords(ReverseRecords).getNames(tokens)
            : new string[](tokens.length);

        infos = new Info[](tokens.length);
        for (uint8 i = 0; i < tokens.length; i++) {
            infos[i] = this.getInfo(tokens[i]);
            infos[i].ensName = ensNames[i];
        }
    }

    /// @notice Gets contract and token information for a an address.
    /// Getting the token name, symbol, decimals and NFT interface checks are wrapped
    /// in a try catch to prevent the call from reverting if the address is not a token.
    function getInfo(address token) external view returns (Info memory info) {
        // Does code exists for the token?
        uint32 size;
        assembly {
            size := extcodesize(token)
        }
        if (size == 0) {
            info.noContract = true;
            return info;
        }

        // Try and get symbol as string
        try this.getSymbol(token) returns (string memory _symbol) {
            info.symbol = _symbol;
        } catch {
            // Try and get symbol as bytes32
            try this.getBytes32Symbol(token) returns (string memory _symbol) {
                info.symbol = _symbol;
            } catch {}
        }

        // Try and get name as string
        try this.getName(token) returns (string memory _name) {
            info.name = _name;
        } catch {
            // Try and get name as bytes32
            try this.getBytes32Name(token) returns (string memory _name) {
                info.name = _name;
            } catch {}
        }

        // Try and get the decimals
        try this.getDecimals(token) returns (uint256 _decimals) {
            info.decimals = _decimals;
        } catch {}

        // Try and see if the contract is a NFT
        try this.isNFT(token) returns (bool _nft) {
            info.nft = _nft;
        } catch {}
    }

    /// @return symbol of the token contract.
    /// @dev will revert if the token is not a contract or does not have a symbol.
    function getSymbol(address token) external view returns (string memory symbol) {
        symbol = IERC20String(token).symbol();
    }

    /// @return name of the token contract.
    /// @dev will revert if the token is not a contract or does not have a name.
    function getName(address token) external view returns (string memory name) {
        name = IERC20String(token).name();
    }

    /// @return symbol of the token contract.
    /// @dev will revert if the token is not a contract or does not have a symbol of bytes32.
    function getBytes32Symbol(address token) external view returns (string memory symbol) {
        bytes32 symbolBytes32 = IERC20Bytes32(token).symbol();
        symbol = bytes32ToString(symbolBytes32);
    }

    /// @return name of the token contract.
    /// @dev will revert if the token is not a contract or does not have a name of bytes32.
    function getBytes32Name(address token) external view returns (string memory name) {
        bytes32 nameBytes32 = IERC20Bytes32(token).name();
        name = bytes32ToString(nameBytes32);
    }

    function bytes32ToString(bytes32 _bytes32) internal pure returns (string memory) {
        uint8 i = 0;
        while (i < 32 && _bytes32[i] != 0) {
            i++;
        }
        bytes memory bytesArray = new bytes(i);
        for (i = 0; i < 32 && _bytes32[i] != 0; i++) {
            bytesArray[i] = _bytes32[i];
        }
        return string(bytesArray);
    }

    /// @return decimals of the token contract.
    /// @dev will revert if the token is not a contract or does not have decimals.
    function getDecimals(address token) external view returns (uint256 decimals) {
        decimals = IERC20Decimal(token).decimals();
    }

    /// @notice is an address a contract or externally owned account?
    /// @dev this will not revert if the address is an externally owned account (EOA).
    function isContract(address account) external view returns (bool) {
        uint32 size;
        assembly {
            size := extcodesize(account)
        }

        return size > 0;
    }

    /// @notice is an address a NFT?
    /// @dev will revert if the token is not a contract or does have the `supportsInterface` function.
    function isNFT(address account) external view returns (bool) {
        return
            IERC165(account).supportsInterface(0x80ac58cd) || // ERC721
            IERC165(account).supportsInterface(0x5b5e139f) || // ERC721Metadata
            IERC165(account).supportsInterface(0x780e9d63) || // ERC721Enumerable
            IERC165(account).supportsInterface(0x9a20483d); // CryptoKitties
    }

    /// @notice Gets the primary Ethereum Name Service name for an address.
    /// @return ensName address 0 will be returned if ENS is not available on the chain
    /// or the address does not have a name.
    function getEnsName(address account) external view returns (string memory ensName) {
        if (address(ReverseRecords) != address(0)) {
            address[] memory addresses = new address[](1);
            addresses[0] = account;
            string[] memory ensNames = IReverseRecords(ReverseRecords).getNames(addresses);
            ensName = ensNames[0];
        }
    }
}
