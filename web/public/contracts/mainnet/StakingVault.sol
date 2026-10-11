// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title StakingVault
 * @author A-Pay Protocol Core Swarm
 * @notice Anti-Spam Collateral & Malicious Behavior Slashing Vault for AI Agents.
 * @dev Implements Pillar 3.4 of RULEBOOK.md:
 *      AI Agents providing paid APIs stake a minimum 500 $APAY bond.
 *      Malicious payloads or SLA violations trigger slashing:
 *      - 50% paid to challenger as refund/bounty
 *      - 50% permanently destroyed via APAYToken.burn()
 */

interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IAPAYTokenBurnable {
    function burn(uint256 amount) external returns (bool);
}

contract StakingVault {
    struct AgentStake {
        uint256 activeStake;
        uint256 unbondingAmount;
        uint256 unbondingUnlockTime;
    }

    address public owner;
    address public arbiter;
    address public immutable apayToken;

    // Minimum collateral required to be recognized as a bonded service provider (500 APAY with 18 decimals)
    uint256 public minBondAmount = 500 * 10 ** 18;

    // Unbonding cooldown to prevent exit-scams right after delivering corrupted data (24 hours)
    uint256 public unbondingCooldown = 1 days;

    mapping(address => AgentStake) public stakes;

    event Staked(
        address indexed agent,
        address indexed depositor,
        uint256 amount,
        uint256 totalActiveStake
    );
    event UnstakeInitiated(address indexed agent, uint256 amount, uint256 unlockTime);
    event UnstakeFinalized(address indexed agent, uint256 amount);
    event AgentSlashed(
        address indexed agent,
        address indexed challenger,
        uint256 slashedAmount,
        uint256 challengerReward,
        uint256 burnedAmount,
        string reason
    );
    event MinBondUpdated(uint256 newMinBond);
    event ArbiterUpdated(address indexed newArbiter);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    error Unauthorized();
    error InvalidParameters();
    error InsufficientStake();
    error CooldownNotElapsed();
    error TransferFailed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyArbiter() {
        if (msg.sender != arbiter && msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address _apayToken, address _initialArbiter) {
        if (_apayToken == address(0)) revert InvalidParameters();
        owner = msg.sender;
        apayToken = _apayToken;
        arbiter = _initialArbiter != address(0) ? _initialArbiter : msg.sender;
    }

    /**
     * @notice Deposit $APAY collateral for an agent (self or delegated).
     * @param agent Address of the service provider AI agent.
     * @param amount Quantity of $APAY (in 18-decimal wei).
     */
    function stake(address agent, uint256 amount) external {
        if (agent == address(0) || amount == 0) revert InvalidParameters();

        if (!IERC20Minimal(apayToken).transferFrom(msg.sender, address(this), amount)) {
            revert TransferFailed();
        }

        stakes[agent].activeStake += amount;

        emit Staked(agent, msg.sender, amount, stakes[agent].activeStake);
    }

    /**
     * @notice Initiate unbonding of active stake with cooldown.
     * @param amount Amount of $APAY to begin unbonding.
     */
    function initiateUnstake(uint256 amount) external {
        if (amount == 0) revert InvalidParameters();
        AgentStake storage s = stakes[msg.sender];
        if (s.activeStake < amount) revert InsufficientStake();

        s.activeStake -= amount;
        s.unbondingAmount += amount;
        s.unbondingUnlockTime = block.timestamp + unbondingCooldown;

        emit UnstakeInitiated(msg.sender, amount, s.unbondingUnlockTime);
    }

    /**
     * @notice Finalize unbonding and withdraw unlocked $APAY once cooldown has elapsed.
     */
    function finalizeUnstake() external {
        AgentStake storage s = stakes[msg.sender];
        uint256 amount = s.unbondingAmount;
        if (amount == 0) revert InsufficientStake();
        if (block.timestamp < s.unbondingUnlockTime) revert CooldownNotElapsed();

        s.unbondingAmount = 0;
        s.unbondingUnlockTime = 0;

        if (!IERC20Minimal(apayToken).transfer(msg.sender, amount)) {
            revert TransferFailed();
        }

        emit UnstakeFinalized(msg.sender, amount);
    }

    /**
     * @notice Check whether an agent meets the minimum collateral bond threshold.
     */
    function isBonded(address agent) external view returns (bool) {
        return stakes[agent].activeStake >= minBondAmount;
    }

    /**
     * @notice Get comprehensive staking status for an agent.
     */
    function getStakeInfo(address agent)
        external
        view
        returns (
            uint256 activeStake,
            uint256 unbondingAmount,
            uint256 unbondingUnlockTime,
            bool bonded
        )
    {
        AgentStake memory s = stakes[agent];
        return (
            s.activeStake,
            s.unbondingAmount,
            s.unbondingUnlockTime,
            s.activeStake >= minBondAmount
        );
    }

    /**
     * @notice Slash an agent's stake due to malicious output or SLA violation.
     * @dev Slashes `slashAmount`: 50% sent to challenger, 50% permanently burned.
     */
    function slash(
        address agent,
        address challenger,
        uint256 slashAmount,
        string calldata reason
    ) external onlyArbiter {
        if (agent == address(0) || challenger == address(0) || slashAmount == 0) {
            revert InvalidParameters();
        }

        AgentStake storage s = stakes[agent];
        if (s.activeStake < slashAmount) revert InsufficientStake();

        s.activeStake -= slashAmount;

        uint256 challengerReward = slashAmount / 2;
        uint256 burnAmount = slashAmount - challengerReward;

        // Reward challenger
        if (challengerReward > 0) {
            if (!IERC20Minimal(apayToken).transfer(challenger, challengerReward)) {
                revert TransferFailed();
            }
        }

        // Deflationary destruction of remainder
        if (burnAmount > 0) {
            IAPAYTokenBurnable(apayToken).burn(burnAmount);
        }

        emit AgentSlashed(agent, challenger, slashAmount, challengerReward, burnAmount, reason);
    }

    // --- Governance Administration ---

    function setMinBondAmount(uint256 newMinBond) external onlyOwner {
        minBondAmount = newMinBond;
        emit MinBondUpdated(newMinBond);
    }

    function setArbiter(address newArbiter) external onlyOwner {
        if (newArbiter == address(0)) revert InvalidParameters();
        arbiter = newArbiter;
        emit ArbiterUpdated(newArbiter);
    }

    function setUnbondingCooldown(uint256 newCooldown) external onlyOwner {
        unbondingCooldown = newCooldown;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidParameters();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
}
