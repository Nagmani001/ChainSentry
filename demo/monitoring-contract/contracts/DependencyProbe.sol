pragma solidity ^0.8.24;

error DependencyUnavailable();

contract DependencyProbe {
    bool public healthy = true;

    event DependencyModeChanged(bool healthy);
    event DependencyPing(address indexed caller, bytes32 indexed correlationId, uint256 blockNumber);

    function setHealthy(bool value) external {
        healthy = value;
        emit DependencyModeChanged(value);
    }

    function ping(bytes32 correlationId) external returns (bool) {
        if (!healthy) revert DependencyUnavailable();
        emit DependencyPing(msg.sender, correlationId, block.number);
        return true;
    }
}
