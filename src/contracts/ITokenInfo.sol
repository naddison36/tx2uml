// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import { Info } from "./TokenInfo.sol";

interface ITokenInfo {
    function getInfoBatch(address[] calldata tokens) external view returns (Info[] memory infos);

    function getInfo(address token) external view returns (Info memory info);

    function getStringProperties(address token)
        external
        view
        returns (string memory symbol, string memory name);

    function getBytes32Properties(address token)
        external
        view
        returns (string memory symbol, string memory name);

    function bytes32ToString(bytes32 _bytes32)
        external
        view
        returns (string memory symbol, string memory name);

    function getDecimals(address token) external view returns (uint256 decimals);

    function isContract(address account) external view returns (bool);

    function isNFT(address account) external view returns (bool);

    function getEnsName(address account) external view returns (string memory ensName);
}
