// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

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
    /// @notice caps the gas used when attempting to get the token symbol, name and decimals
    uint256 CALL_GAS_LIMIT = 50000;

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
    function getInfoBatch(address[] calldata tokens)
        external
        view
        returns (Info[] memory infos)
    {
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
        try this._getStringProperty(token, "symbol()") returns (
            string memory _symbol
        ) {
            info.symbol = _symbol;
        } catch {
            // Try and get symbol as bytes32
            try this._getBytes32Property(token, "symbol()") returns (
                string memory _symbol
            ) {
                info.symbol = _symbol;
            } catch {}
        }

        // Try and get name as string
        try this._getStringProperty(token, "name()") returns (
            string memory _name
        ) {
            info.name = _name;
        } catch {
            // Try and get name as bytes32
            try this._getBytes32Property(token, "name()") returns (
                string memory _name
            ) {
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

    function _getStringProperty(address token, string memory property)
        public
        view
        returns (string memory value)
    {
        (bool success, bytes memory returndata) = token.staticcall{
            gas: CALL_GAS_LIMIT
        }(abi.encodeWithSignature(property));
        if (success) {
            value = abi.decode(returndata, (string));
        }
    }

    function _getBytes32Property(address token, string memory property)
        public
        view
        returns (string memory value)
    {
        (bool success, bytes memory returndata) = token.staticcall{
            gas: CALL_GAS_LIMIT
        }(abi.encodeWithSignature(property));
        if (success) {
            bytes32 nameBytes32 = abi.decode(returndata, (bytes32));
            value = bytes32ToString(nameBytes32);
        }
    }

    function bytes32ToString(bytes32 _bytes32)
        internal
        pure
        returns (string memory)
    {
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
    function getDecimals(address token)
        external
        view
        returns (uint256 decimals)
    {
        (bool success, bytes memory returndata) = token.staticcall{
            gas: CALL_GAS_LIMIT
        }(abi.encodeWithSignature("decimals()"));
        if (success) {
            decimals = abi.decode(returndata, (uint256));
        }
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
            supportInterface(account, 0x80ac58cd) || // ERC721
            supportInterface(account, 0x5b5e139f) || // ERC721Metadata
            supportInterface(account, 0x780e9d63) || // ERC721Enumerable
            supportInterface(account, 0x9a20483d); // CryptoKitties
    }

    function supportInterface(address account, bytes4 interfaceId)
        public
        view
        returns (bool supported)
    {
        (bool success, bytes memory returndata) = account.staticcall{
            gas: CALL_GAS_LIMIT
        }(abi.encodeWithSignature("supportsInterface(bytes4)", interfaceId));
        if (success) {
            supported = abi.decode(returndata, (bool));
        }
    }

    /// @notice Gets the primary Ethereum Name Service name for an address.
    /// @return ensName address 0 will be returned if ENS is not available on the chain
    /// or the address does not have a name.
    function getEnsName(address account)
        external
        view
        returns (string memory ensName)
    {
        if (address(ReverseRecords) != address(0)) {
            address[] memory addresses = new address[](1);
            addresses[0] = account;
            string[] memory ensNames = IReverseRecords(ReverseRecords).getNames(
                addresses
            );
            ensName = ensNames[0];
        }
    }
}
