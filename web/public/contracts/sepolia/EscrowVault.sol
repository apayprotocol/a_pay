// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title EscrowVault
 * @author A-Pay Protocol Core Swarm
 * @notice Master deposit vault with non-custodial delegated session keys for AI agent swarms.
 * @dev Operators deposit once and authorize ephemeral agent wallets with strict daily spending limits.
 */
interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

contract EscrowVault {
    struct AgentAuth {
        uint256 dailyLimit;
        uint256 spentToday;
        uint256 lastResetDay;
        uint256 expiresAt;
        bool active;
    }

    // operator => token => balance
    mapping(address => mapping(address => uint256)) public balances;

    // operator => agent => token => AgentAuth
    mapping(address => mapping(address => mapping(address => AgentAuth))) public authorizations;

    event Deposited(address indexed operator, address indexed token, uint256 amount);
    event Withdrawn(address indexed operator, address indexed token, uint256 amount);
    event AgentAuthorized(
        address indexed operator,
        address indexed agent,
        address indexed token,
        uint256 dailyLimit,
        uint256 expiresAt
    );
    event AgentRevoked(address indexed operator, address indexed agent, address indexed token);
    event AgentSpent(
        address indexed operator,
        address indexed agent,
        address indexed token,
        address recipient,
        uint256 amount
    );

    error InsufficientBalance();
    error TransferFailed();
    error Unauthorized();
    error SessionExpired();
    error DailyLimitExceeded();
    error InvalidParameters();

    /**
     * @notice Deposit funds into the master vault.
     */
    function deposit(address token, uint256 amount) external {
        if (amount == 0 || token == address(0)) revert InvalidParameters();
        if (!IERC20Minimal(token).transferFrom(msg.sender, address(this), amount)) revert TransferFailed();

        balances[msg.sender][token] += amount;
        emit Deposited(msg.sender, token, amount);
    }

    /**
     * @notice Withdraw deposited funds from the master vault.
     */
    function withdraw(address token, uint256 amount) external {
        if (amount == 0) revert InvalidParameters();
        if (balances[msg.sender][token] < amount) revert InsufficientBalance();

        balances[msg.sender][token] -= amount;
        if (!IERC20Minimal(token).transfer(msg.sender, amount)) revert TransferFailed();

        emit Withdrawn(msg.sender, token, amount);
    }

    /**
     * @notice Authorize an ephemeral AI agent wallet with daily spending guardrails.
     */
    function authorizeAgent(
        address agent,
        address token,
        uint256 dailyLimit,
        uint256 expiresAt
    ) external {
        if (agent == address(0) || token == address(0) || dailyLimit == 0) revert InvalidParameters();
        if (expiresAt <= block.timestamp) revert SessionExpired();

        authorizations[msg.sender][agent][token] = AgentAuth({
            dailyLimit: dailyLimit,
            spentToday: 0,
            lastResetDay: block.timestamp / 1 days,
            expiresAt: expiresAt,
            active: true
        });

        emit AgentAuthorized(msg.sender, agent, token, dailyLimit, expiresAt);
    }

    /**
     * @notice Revoke an authorized agent's session key.
     */
    function revokeAgent(address agent, address token) external {
        authorizations[msg.sender][agent][token].active = false;
        emit AgentRevoked(msg.sender, agent, token);
    }

    /**
     * @notice Spend from operator's master balance on behalf of an authorized agent session.
     */
    function spend(
        address operator,
        address token,
        address recipient,
        uint256 amount
    ) external {
        AgentAuth storage auth = authorizations[operator][msg.sender][token];
        if (!auth.active) revert Unauthorized();
        if (block.timestamp > auth.expiresAt) revert SessionExpired();

        // Check & update rolling daily period
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > auth.lastResetDay) {
            auth.spentToday = 0;
            auth.lastResetDay = currentDay;
        }

        if (auth.spentToday + amount > auth.dailyLimit) revert DailyLimitExceeded();
        if (balances[operator][token] < amount) revert InsufficientBalance();

        auth.spentToday += amount;
        balances[operator][token] -= amount;

        if (!IERC20Minimal(token).transfer(recipient, amount)) revert TransferFailed();

        emit AgentSpent(operator, msg.sender, token, recipient, amount);
    }
}
