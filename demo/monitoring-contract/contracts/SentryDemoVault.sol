pragma solidity ^0.8.24;

interface IDependencyProbe {
    function ping(bytes32 correlationId) external returns (bool);
}

error EmptyDeposit();
error NotOwner();
error SimulatedProductionRevert();

contract SentryDemoVault {
    address public owner;
    IDependencyProbe public dependency;
    uint256 public totalDeposits;
    uint256 public totalFailures;

    event DepositObserved(address indexed user, uint256 amount, uint256 totalDeposits, bytes32 indexed correlationId);
    event DependencyCallSucceeded(address indexed dependency, bytes32 indexed correlationId, uint256 blockNumber);
    event DependencyCallFailed(address indexed dependency, bytes32 indexed correlationId, bytes reason, uint256 failureCount);
    event IncidentMarker(string severity, string reason, uint256 failureCount, bytes32 indexed correlationId);
    event WithdrawalObserved(address indexed operator, address indexed to, uint256 amount);

    constructor(address dependencyAddress) {
        owner = msg.sender;
        dependency = IDependencyProbe(dependencyAddress);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function depositAndProbe(bytes32 correlationId) external payable {
        if (msg.value == 0) revert EmptyDeposit();
        totalDeposits += msg.value;
        emit DepositObserved(msg.sender, msg.value, totalDeposits, correlationId);
        try dependency.ping(correlationId) returns (bool) {
            emit DependencyCallSucceeded(address(dependency), correlationId, block.number);
        } catch (bytes memory reason) {
            totalFailures += 1;
            emit DependencyCallFailed(address(dependency), correlationId, reason, totalFailures);
            if (totalFailures % 3 == 0) {
                emit IncidentMarker("critical", "dependency failure burst", totalFailures, correlationId);
            }
        }
    }

    function setDependency(address dependencyAddress) external onlyOwner {
        dependency = IDependencyProbe(dependencyAddress);
    }

    function withdraw(address payable to, uint256 amount) external onlyOwner {
        to.transfer(amount);
        emit WithdrawalObserved(msg.sender, to, amount);
    }

    function forceRevert() external pure {
        revert SimulatedProductionRevert();
    }
}
